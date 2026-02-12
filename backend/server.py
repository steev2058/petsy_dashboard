from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, WebSocket, WebSocketDisconnect, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.encoders import jsonable_encoder
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Set, Any
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
import random
import base64
import smtplib
from email.message import EmailMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'petsy_db')]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'petsy-secret-key-2025')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30
ALLOW_INSECURE_AUTH_CODE_RESPONSE = os.environ.get("ALLOW_INSECURE_AUTH_CODE_RESPONSE", "false").lower() == "true"

# Create the main app
app = FastAPI(title="Petsy API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ========================= REALTIME CHAT (WEBSOCKET) =========================

class ChatConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    def is_online(self, user_id: str) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    def online_user_ids(self) -> List[str]:
        return list(self.active_connections.keys())

    async def send_user_event(self, user_id: str, event: Dict[str, Any]):
        sockets = list(self.active_connections.get(user_id, set()))
        stale: List[WebSocket] = []
        encoded_event = jsonable_encoder(event)
        for ws in sockets:
            try:
                await ws.send_json(encoded_event)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(user_id, ws)

    async def broadcast_event(self, event: Dict[str, Any]):
        users = list(self.active_connections.keys())
        for uid in users:
            await self.send_user_event(uid, event)

chat_ws_manager = ChatConnectionManager()

async def notify_conversation_participants(conversation_id: str, event_type: str, payload: Dict[str, Any]):
    conversation = await db.conversations.find_one({"id": conversation_id})
    if not conversation:
        return
    participants = conversation.get("participants", [])
    event = {
        "type": event_type,
        "conversation_id": conversation_id,
        "payload": payload,
        "timestamp": datetime.utcnow().isoformat(),
    }
    for user_id in participants:
        await chat_ws_manager.send_user_event(user_id, event)

async def user_is_conversation_participant(user_id: str, conversation_id: str) -> bool:
    conversation = await db.conversations.find_one({"id": conversation_id, "participants": user_id})
    return conversation is not None

async def create_notification(user_id: str, title: str, body: str, notif_type: str = "system", data: Optional[dict] = None):
    if not user_id:
        return
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "body": body,
        "type": notif_type,
        "data": data or {},
        "is_read": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })

async def create_notifications_for_admins(title: str, body: str, notif_type: str = "admin", data: Optional[dict] = None):
    admins = await db.users.find({"$or": [{"is_admin": True}, {"role": "admin"}]}).to_list(500)
    for admin in admins:
        await create_notification(admin.get("id"), title, body, notif_type, data)

async def get_friend_ids_set(user_id: str) -> Set[str]:
    rows = await db.friendships.find({"users": user_id}).to_list(5000)
    result: Set[str] = set()
    for fr in rows:
        for uid in fr.get("users", []):
            if uid and uid != user_id:
                result.add(uid)
    return result

async def audit_admin_action(admin_user: dict, action: str, target_type: str, target_id: Optional[str] = None, payload: Optional[dict] = None):
    try:
        await db.admin_audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "admin_user_id": admin_user.get("id"),
            "admin_email": admin_user.get("email"),
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "payload": payload or {},
            "created_at": datetime.utcnow(),
        })
    except Exception as e:
        logger.warning(f"Failed to write admin audit log: {e}")

# ========================= MODELS =========================

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    language: str = "en"

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class DeleteAccountRequest(BaseModel):
    password: Optional[str] = None

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: Optional[str] = None
    user_code: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_verified: bool = False
    is_admin: bool = False
    role: str = "user"  # user, admin
    verification_code: Optional[str] = None
    reset_code: Optional[str] = None
    reset_code_expires_at: Optional[datetime] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    username: Optional[str] = None
    user_code: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    language: str
    is_verified: bool
    is_admin: bool = False
    role: str = "user"
    created_at: datetime

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    language: Optional[str] = None

# Pet Models
class PetBase(BaseModel):
    name: str
    species: str  # dog, cat, bird, etc.
    breed: Optional[str] = None
    age: Optional[str] = None
    gender: str  # male, female
    color: Optional[str] = None
    weight: Optional[float] = None
    description: Optional[str] = None
    image: Optional[str] = None
    status: str = "owned"  # owned, for_sale, for_adoption, lost, found
    price: Optional[float] = None
    location: Optional[str] = None
    vaccinated: bool = False
    neutered: bool = False

class PetCreate(PetBase):
    pass

class Pet(PetBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    likes: int = 0
    views: int = 0

class PetUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    color: Optional[str] = None
    weight: Optional[float] = None
    description: Optional[str] = None
    image: Optional[str] = None
    status: Optional[str] = None
    price: Optional[float] = None
    location: Optional[str] = None
    vaccinated: Optional[bool] = None
    neutered: Optional[bool] = None

# Pet Health Record
class HealthRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pet_id: str
    record_type: str  # vaccination, checkup, treatment, weight
    title: str
    description: Optional[str] = None
    date: str
    vet_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class HealthRecordCreate(BaseModel):
    pet_id: str
    record_type: str
    title: str
    description: Optional[str] = None
    date: str
    vet_name: Optional[str] = None
    notes: Optional[str] = None

# Veterinarian Models
class VetBase(BaseModel):
    name: str
    specialty: str  # dogs, cats, birds, all
    experience_years: int
    phone: str
    email: Optional[str] = None
    clinic_name: str
    address: str
    city: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rating: float = 0.0
    reviews_count: int = 0
    image: Optional[str] = None
    available_hours: Optional[str] = None
    services: List[str] = []

class Vet(VetBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Product Models (Shop)
class ProductBase(BaseModel):
    name: str
    category: str  # food, medicine, toys, cages, shampoo, accessories
    description: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    image: Optional[str] = None
    brand: Optional[str] = None
    pet_type: str  # dog, cat, bird, all
    in_stock: bool = True
    quantity: int = 0
    rating: float = 0.0

class Product(ProductBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Emergency Contact Models
class EmergencyContact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # vet, clinic, rescue, shelter
    phone: str
    address: Optional[str] = None
    city: str
    is_24_hours: bool = False
    notes: Optional[str] = None

# Message Models
class MessageBase(BaseModel):
    receiver_id: str
    subject: str
    content: str
    pet_id: Optional[str] = None

class Message(MessageBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_read: bool = False

# Lost & Found
class LostFoundPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # lost, found
    pet_species: str
    breed: Optional[str] = None
    color: Optional[str] = None
    description: str
    last_seen_location: str
    last_seen_date: str
    contact_phone: str
    image: Optional[str] = None
    status: str = "active"  # active, resolved
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LostFoundCreate(BaseModel):
    type: str
    pet_species: str
    breed: Optional[str] = None
    color: Optional[str] = None
    description: str
    last_seen_location: str
    last_seen_date: str
    contact_phone: str
    image: Optional[str] = None

# Community Post
class CommunityPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    type: str  # question, story, tip, sponsorship
    title: str
    content: str
    image: Optional[str] = None
    likes: int = 0
    comments_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CommunityPostCreate(BaseModel):
    type: str
    title: str
    content: str
    image: Optional[str] = None

# Appointment
class Appointment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    vet_id: str
    pet_id: Optional[str] = None
    date: str
    time: str
    reason: str
    status: str = "pending"  # pending, confirmed, completed, cancelled
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AppointmentCreate(BaseModel):
    vet_id: str
    pet_id: Optional[str] = None
    date: str
    time: str
    reason: str
    notes: Optional[str] = None

# Favorite
class Favorite(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    pet_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Cart Item
class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    name: str
    price: float
    image: Optional[str] = None

# Order Models
class OrderItem(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int
    image: Optional[str] = None
    seller_user_id: Optional[str] = None

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[OrderItem]
    total: float
    status: str = "pending"  # pending, confirmed, shipped, delivered, cancelled
    shipping_address: str
    shipping_city: str
    shipping_phone: str
    payment_method: str = "cash_on_delivery"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OrderCreate(BaseModel):
    items: List[OrderItem]
    total: float
    shipping_address: str
    shipping_city: str
    shipping_phone: str
    payment_method: str = "cash_on_delivery"
    notes: Optional[str] = None
    points_used: int = 0  # Loyalty points to redeem

# Payment Models
class PaymentMethod(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # stripe, paypal, shamcash
    card_last_four: Optional[str] = None
    card_brand: Optional[str] = None  # visa, mastercard
    is_default: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PaymentIntent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    currency: str = "USD"
    payment_method: str  # stripe, paypal, shamcash, cash_on_delivery
    status: str = "pending"  # pending, processing, succeeded, failed, cancelled
    order_id: Optional[str] = None
    appointment_id: Optional[str] = None
    sponsorship_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PaymentRequest(BaseModel):
    amount: float
    payment_method: str  # stripe, paypal, shamcash, cash_on_delivery
    card_number: Optional[str] = None  # For stripe
    card_expiry: Optional[str] = None
    card_cvc: Optional[str] = None
    order_id: Optional[str] = None
    appointment_id: Optional[str] = None
    sponsorship_id: Optional[str] = None
    points_to_use: int = 0

# Loyalty Points Models
class LoyaltyPoints(BaseModel):
    user_id: str
    total_points: int = 0
    lifetime_points: int = 0
    tier: str = "bronze"  # bronze, silver, gold, platinum

class PointsTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    points: int  # positive for earned, negative for redeemed
    transaction_type: str  # earned, redeemed, bonus, expired
    description: str
    reference_id: Optional[str] = None  # order_id, appointment_id, etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Conversation & Chat
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_read: bool = False

class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    participants: List[str]  # user IDs
    pet_id: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ConversationCreate(BaseModel):
    other_user_id: str
    pet_id: Optional[str] = None
    initial_message: str

# Map Location
class MapLocation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # vet, clinic, shelter, pet_shop, park
    address: str
    city: str
    latitude: float
    longitude: float
    phone: Optional[str] = None
    rating: float = 0.0
    is_open_now: bool = False
    hours: Optional[str] = None
    image: Optional[str] = None

# Token Response
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ========================= HELPERS =========================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def generate_verification_code() -> str:
    return str(random.randint(1000, 9999))

def normalize_username(value: str) -> str:
    clean = ''.join(ch for ch in (value or '').lower() if ch.isalnum() or ch in ['_', '.'])
    return clean[:24]

def generate_user_code(user_id: str) -> str:
    suffix = (user_id or '').replace('-', '')[-6:].upper()
    return f"PET-{suffix}"

def smtp_is_configured() -> bool:
    return bool(
        os.environ.get("SMTP_HOST")
        and os.environ.get("SMTP_PORT")
        and os.environ.get("SMTP_USERNAME")
        and os.environ.get("SMTP_PASSWORD")
        and os.environ.get("SMTP_FROM_EMAIL")
    )

def send_email_smtp(to_email: str, subject: str, body: str) -> None:
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", "587"))
    username = os.environ.get("SMTP_USERNAME")
    password = os.environ.get("SMTP_PASSWORD")
    from_email = os.environ.get("SMTP_FROM_EMAIL")

    if not all([host, port, username, password, from_email]):
        raise RuntimeError("SMTP is not fully configured")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(body)

    with smtplib.SMTP(host, port, timeout=20) as server:
        server.starttls()
        server.login(username, password)
        server.send_message(msg)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)) -> Optional[dict]:
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        return await db.users.find_one({"id": user_id})
    except Exception:
        return None

ALLOWED_ROLES = {"user", "admin", "vet", "market_owner", "care_clinic"}

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify user has admin privileges"""
    if not current_user.get("is_admin", False) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def require_roles(*roles: str):
    async def _guard(current_user: dict = Depends(get_current_user)) -> dict:
        role = (current_user.get("role") or "user").strip()
        if role not in roles and not current_user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Access denied for this role")
        return current_user
    return _guard

# ========================= REALTIME ROUTES =========================

async def get_user_from_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        return await db.users.find_one({"id": user_id})
    except Exception:
        return None

@app.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=1008)
        return

    user_id = user["id"]
    await chat_ws_manager.connect(user_id, websocket)

    # announce online presence + initial state
    await chat_ws_manager.broadcast_event({
        "type": "presence_update",
        "payload": {"user_id": user_id, "is_online": True}
    })

    try:
        await websocket.send_json({
            "type": "connected",
            "user_id": user_id,
            "payload": {"online_user_ids": chat_ws_manager.online_user_ids()}
        })

        while True:
            message = await websocket.receive_json()
            event_type = message.get("type")
            conversation_id = message.get("conversation_id")

            if event_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if event_type in {"typing", "read"}:
                if not conversation_id or not await user_is_conversation_participant(user_id, conversation_id):
                    continue

            if event_type == "typing":
                await notify_conversation_participants(
                    conversation_id,
                    "typing",
                    {
                        "user_id": user_id,
                        "is_typing": bool(message.get("is_typing", False))
                    },
                )
            elif event_type == "read":
                await db.chat_messages.update_many(
                    {"conversation_id": conversation_id, "sender_id": {"$ne": user_id}, "is_read": False},
                    {"$set": {"is_read": True}},
                )
                await notify_conversation_participants(
                    conversation_id,
                    "messages_read",
                    {"reader_id": user_id},
                )

    except WebSocketDisconnect:
        chat_ws_manager.disconnect(user_id, websocket)
        await chat_ws_manager.broadcast_event({
            "type": "presence_update",
            "payload": {"user_id": user_id, "is_online": chat_ws_manager.is_online(user_id)}
        })
    except Exception:
        chat_ws_manager.disconnect(user_id, websocket)
        await chat_ws_manager.broadcast_event({
            "type": "presence_update",
            "payload": {"user_id": user_id, "is_online": chat_ws_manager.is_online(user_id)}
        })

DEFAULT_USER_SETTINGS = {
    "push_notifications": True,
    "dark_mode": False,
    "location_services": True,
    "email_updates": True,
    "chat_sound": True,
    "chat_preview": True,
    "allow_friend_requests": "everyone",  # everyone | nobody
    "allow_direct_messages": "everyone",  # everyone | friends_only
    "language": "en",
}

# ========================= AUTH ROUTES =========================

@api_router.post("/auth/signup", response_model=dict)
async def signup(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    verification_code = generate_verification_code()

    base_username = normalize_username(user_data.name) or f"user{random.randint(1000, 9999)}"
    username = base_username
    i = 1
    while await db.users.find_one({"username": username}):
        i += 1
        username = f"{base_username}{i}"

    user = User(
        email=user_data.email,
        name=user_data.name,
        username=username,
        phone=user_data.phone,
        verification_code=verification_code
    )
    user.user_code = generate_user_code(user.id)
    user_dict = user.dict()
    user_dict["password_hash"] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    logger.info(f"User registered: {user.email}, verification code: {verification_code}")

    if smtp_is_configured():
        try:
            send_email_smtp(
                user.email,
                "Your Petsy verification code",
                f"Welcome to Petsy!\n\nYour verification code is: {verification_code}\n\nThis code is for your account verification.",
            )
            return {"message": "User created. Verification code sent to email.", "user_id": user.id}
        except Exception as e:
            logger.error(f"SMTP send failed on signup: {e}")
            if ALLOW_INSECURE_AUTH_CODE_RESPONSE:
                # Explicitly opt-in dev fallback only
                return {"message": "User created. Email sending failed; using demo code.", "user_id": user.id, "verification_code": verification_code}
            return {"message": "User created. Email delivery failed. Please retry resend verification.", "user_id": user.id}

    if ALLOW_INSECURE_AUTH_CODE_RESPONSE:
        return {"message": "User created. Please verify your account.", "user_id": user.id, "verification_code": verification_code}

    return {"message": "User created. Please verify your account.", "user_id": user.id}

@api_router.post("/auth/resend-verification", response_model=dict)
async def resend_verification(req: ResendVerificationRequest):
    user = await db.users.find_one({"email": req.email})
    if not user:
        return {"message": "If that email exists, a verification code has been generated."}

    if user.get("is_verified", False):
        return {"message": "Account is already verified."}

    verification_code = generate_verification_code()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"verification_code": verification_code}},
    )

    if smtp_is_configured():
        try:
            send_email_smtp(
                req.email,
                "Your Petsy verification code",
                f"Your new verification code is: {verification_code}",
            )
            return {"message": "Verification code sent to email."}
        except Exception as e:
            logger.error(f"SMTP send failed on resend verification: {e}")

    if ALLOW_INSECURE_AUTH_CODE_RESPONSE:
        return {
            "message": "Verification code generated.",
            "verification_code": verification_code,
        }

    return {"message": "Verification code generated. If email delivery is configured, check your inbox."}

@api_router.post("/auth/verify", response_model=TokenResponse)
async def verify_account(user_id: str, code: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("verification_code") != code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    await db.users.update_one({"id": user_id}, {"$set": {"is_verified": True, "verification_code": None}})
    
    token = create_access_token({"sub": user["id"]})
    user["is_verified"] = True
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user)
    )

@api_router.post("/auth/forgot-password", response_model=dict)
async def forgot_password(req: ForgotPasswordRequest):
    user = await db.users.find_one({"email": req.email})

    # Always return success-like message to avoid email enumeration
    if not user:
        return {"message": "If that email exists, a reset code has been generated."}

    reset_code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"reset_code": reset_code, "reset_code_expires_at": expires_at}},
    )

    if smtp_is_configured():
        try:
            send_email_smtp(
                req.email,
                "Your Petsy password reset code",
                f"Your password reset code is: {reset_code}\nThis code expires in 15 minutes.",
            )
            return {
                "message": "If that email exists, a reset code has been sent.",
                "expires_at": expires_at.isoformat(),
            }
        except Exception as e:
            logger.error(f"SMTP send failed on forgot password: {e}")

    if ALLOW_INSECURE_AUTH_CODE_RESPONSE:
        # Explicitly opt-in dev fallback: return code directly
        return {
            "message": "Password reset code generated.",
            "reset_code": reset_code,
            "expires_at": expires_at.isoformat(),
        }

    return {
        "message": "If that email exists, a reset code has been generated.",
        "expires_at": expires_at.isoformat(),
    }

@api_router.post("/auth/reset-password", response_model=dict)
async def reset_password(req: ResetPasswordRequest):
    user = await db.users.find_one({"email": req.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    code = user.get("reset_code")
    exp = user.get("reset_code_expires_at")
    if not code or not exp:
        raise HTTPException(status_code=400, detail="No reset request found")

    if req.code != code:
        raise HTTPException(status_code=400, detail="Invalid reset code")

    if isinstance(exp, str):
        try:
            exp = datetime.fromisoformat(exp)
        except Exception:
            exp = None

    if not exp or exp < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset code expired")

    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {"password_hash": hash_password(req.new_password)},
            "$unset": {"reset_code": "", "reset_code_expires_at": ""},
        },
    )

    return {"message": "Password reset successful"}

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.get("is_verified", False):
        raise HTTPException(status_code=403, detail="Please verify your account before login")

    patch = {}
    if not user.get("username"):
        base = normalize_username(user.get("name") or "user") or f"user{random.randint(1000,9999)}"
        candidate = base
        i = 1
        while await db.users.find_one({"username": candidate, "id": {"$ne": user["id"]}}):
            i += 1
            candidate = f"{base}{i}"
        patch["username"] = candidate
    if not user.get("user_code"):
        patch["user_code"] = generate_user_code(user["id"])
    if patch:
        await db.users.update_one({"id": user["id"]}, {"$set": patch})
        user.update(patch)

    token = create_access_token({"sub": user["id"]})
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user)
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    patch = {}
    if not current_user.get("username"):
        base = normalize_username(current_user.get("name") or "user") or f"user{random.randint(1000,9999)}"
        candidate = base
        i = 1
        while await db.users.find_one({"username": candidate, "id": {"$ne": current_user["id"]}}):
            i += 1
            candidate = f"{base}{i}"
        patch["username"] = candidate
    if not current_user.get("user_code"):
        patch["user_code"] = generate_user_code(current_user["id"])
    if patch:
        await db.users.update_one({"id": current_user["id"]}, {"$set": patch})
        current_user.update(patch)
    return UserResponse(**current_user)

@api_router.put("/auth/update", response_model=UserResponse)
async def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if update_dict:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_dict})
    updated = await db.users.find_one({"id": current_user["id"]})
    return UserResponse(**updated)

@api_router.post('/auth/change-password')
async def change_password(payload: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    if not verify_password(payload.current_password, current_user.get('password_hash', '')):
        raise HTTPException(status_code=400, detail='Current password is incorrect')
    if len(payload.new_password or '') < 6:
        raise HTTPException(status_code=400, detail='New password must be at least 6 characters')
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"password_hash": hash_password(payload.new_password)}})
    return {"message": "Password changed successfully"}

@api_router.post('/auth/delete-account')
async def delete_account(payload: DeleteAccountRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get('password_hash'):
        if not payload.password or not verify_password(payload.password, current_user.get('password_hash', '')):
            raise HTTPException(status_code=400, detail='Password is required to delete account')

    uid = current_user['id']
    await db.users.delete_one({"id": uid})
    await db.pets.delete_many({"owner_id": uid})
    await db.comments.delete_many({"user_id": uid})
    await db.community.delete_many({"user_id": uid})
    await db.conversations.delete_many({"participants": uid})
    await db.chat_messages.delete_many({"sender_id": uid})
    await db.favorites.delete_many({"user_id": uid})
    await db.friend_requests.delete_many({"$or": [{"from_user_id": uid}, {"to_user_id": uid}]})
    await db.friendships.delete_many({"users": uid})
    await db.user_settings.delete_many({"user_id": uid})
    await db.blocked_users.delete_many({"$or": [{"user_id": uid}, {"blocked_user_id": uid}]})
    await db.community_post_notifications.delete_many({"user_id": uid})
    await db.community_reports.delete_many({"reported_by": uid})
    await db.notifications.delete_many({"user_id": uid})
    return {"message": "Account deleted"}

@api_router.get('/user-settings')
async def get_user_settings(current_user: dict = Depends(get_current_user)):
    row = await db.user_settings.find_one({"user_id": current_user["id"]})
    if not row:
        row = {"user_id": current_user["id"], **DEFAULT_USER_SETTINGS}
        await db.user_settings.insert_one({**row, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()})
    return {k: row.get(k, DEFAULT_USER_SETTINGS.get(k)) for k in DEFAULT_USER_SETTINGS.keys()}

@api_router.put('/user-settings')
async def update_user_settings(data: dict, current_user: dict = Depends(get_current_user)):
    allowed = set(DEFAULT_USER_SETTINGS.keys())
    patch = {k: v for k, v in (data or {}).items() if k in allowed}
    if not patch:
        return await get_user_settings(current_user)

    await db.user_settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": {**patch, "updated_at": datetime.utcnow()}, "$setOnInsert": {"created_at": datetime.utcnow()}},
        upsert=True,
    )
    row = await db.user_settings.find_one({"user_id": current_user["id"]})
    return {k: row.get(k, DEFAULT_USER_SETTINGS.get(k)) for k in DEFAULT_USER_SETTINGS.keys()}

@api_router.get('/notifications')
async def get_my_notifications(
    unread_only: bool = False,
    notif_type: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    query: dict = {"user_id": current_user["id"]}
    if unread_only:
        query["is_read"] = False
    if notif_type and notif_type != "all":
        query["type"] = notif_type

    safe_limit = max(1, min(limit, 100))
    safe_offset = max(0, offset)
    rows = await db.notifications.find(query).sort("created_at", -1).skip(safe_offset).limit(safe_limit).to_list(safe_limit)
    total = await db.notifications.count_documents(query)
    return {
        "items": [{k: v for k, v in row.items() if k != "_id"} for row in rows],
        "total": total,
        "limit": safe_limit,
        "offset": safe_offset,
        "has_more": safe_offset + len(rows) < total,
    }

@api_router.get('/notifications/unread-count')
async def get_unread_notifications_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": current_user["id"], "is_read": False})
    return {"count": count}

@api_router.put('/notifications/{notification_id}/read')
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True, "updated_at": datetime.utcnow()}},
    )
    return {"success": True}

@api_router.put('/notifications/read-all')
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True, "updated_at": datetime.utcnow()}},
    )
    return {"success": True}

@api_router.delete('/notifications/clear-all')
async def clear_all_notifications(current_user: dict = Depends(get_current_user)):
    await db.notifications.delete_many({"user_id": current_user["id"]})
    return {"success": True}

# ========================= PET ROUTES =========================

@api_router.post("/pets", response_model=Pet)
async def create_pet(pet_data: PetCreate, current_user: dict = Depends(get_current_user)):
    species = (pet_data.species or '').strip().lower()
    status_val = (pet_data.status or '').strip().lower()
    if species == 'dog' and status_val == 'for_sale':
        raise HTTPException(status_code=400, detail='Dogs are adoption/rehoming only and cannot be listed for sale')

    pet = Pet(**pet_data.dict(), owner_id=current_user["id"])
    await db.pets.insert_one(pet.dict())
    return pet

@api_router.get("/pets", response_model=List[Pet])
async def get_pets(
    status: Optional[str] = None,
    species: Optional[str] = None,
    city: Optional[str] = None,
    gender: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    query = {}
    if status:
        query["status"] = status
    if species:
        query["species"] = species
    if city:
        query["location"] = {"$regex": city, "$options": "i"}
    if gender:
        query["gender"] = gender
    
    pets = await db.pets.find(query).skip(skip).limit(limit).to_list(limit)
    return [Pet(**pet) for pet in pets]

@api_router.get("/pets/my", response_model=List[Pet])
async def get_my_pets(current_user: dict = Depends(get_current_user)):
    pets = await db.pets.find({"owner_id": current_user["id"]}).to_list(100)
    return [Pet(**pet) for pet in pets]

@api_router.get("/pets/{pet_id}", response_model=Pet)
async def get_pet(pet_id: str):
    pet = await db.pets.find_one({"id": pet_id})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    # Increment views
    await db.pets.update_one({"id": pet_id}, {"$inc": {"views": 1}})
    return Pet(**pet)

@api_router.put("/pets/{pet_id}", response_model=Pet)
async def update_pet(pet_id: str, pet_data: PetUpdate, current_user: dict = Depends(get_current_user)):
    pet = await db.pets.find_one({"id": pet_id, "owner_id": current_user["id"]})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found or not authorized")
    
    update_dict = {k: v for k, v in pet_data.dict().items() if v is not None}
    if update_dict:
        next_species = (update_dict.get('species') or pet.get('species') or '').strip().lower()
        next_status = (update_dict.get('status') or pet.get('status') or '').strip().lower()
        if next_species == 'dog' and next_status == 'for_sale':
            raise HTTPException(status_code=400, detail='Dogs are adoption/rehoming only and cannot be listed for sale')
        await db.pets.update_one({"id": pet_id}, {"$set": update_dict})
    
    updated = await db.pets.find_one({"id": pet_id})
    return Pet(**updated)

@api_router.delete("/pets/{pet_id}")
async def delete_pet(pet_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.pets.delete_one({"id": pet_id, "owner_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pet not found or not authorized")
    return {"message": "Pet deleted"}

@api_router.post("/pets/{pet_id}/like")
async def like_pet(pet_id: str, current_user: dict = Depends(get_current_user)):
    pet = await db.pets.find_one({"id": pet_id})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # Check if already favorited
    existing = await db.favorites.find_one({"user_id": current_user["id"], "pet_id": pet_id})
    if existing:
        # Unlike
        await db.favorites.delete_one({"id": existing["id"]})
        await db.pets.update_one({"id": pet_id}, {"$inc": {"likes": -1}})
        return {"liked": False}
    else:
        # Like
        favorite = Favorite(user_id=current_user["id"], pet_id=pet_id)
        await db.favorites.insert_one(favorite.dict())
        await db.pets.update_one({"id": pet_id}, {"$inc": {"likes": 1}})
        return {"liked": True}

@api_router.get("/favorites/pets", response_model=List[Pet])
async def get_favorite_pets_legacy(current_user: dict = Depends(get_current_user)):
    favorites = await db.favorites.find({"user_id": current_user["id"]}).to_list(100)
    pet_ids = [f.get("pet_id") for f in favorites if f.get("pet_id")]
    pets = await db.pets.find({"id": {"$in": pet_ids}}).to_list(100)
    return [Pet(**pet) for pet in pets]

# ========================= HEALTH RECORDS =========================

@api_router.post("/health-records", response_model=HealthRecord)
async def create_health_record(record: HealthRecordCreate, current_user: dict = Depends(get_current_user)):
    # Verify pet belongs to user
    pet = await db.pets.find_one({"id": record.pet_id, "owner_id": current_user["id"]})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    health_record = HealthRecord(**record.dict(), user_id=current_user["id"])
    await db.health_records.insert_one(health_record.dict())
    return health_record

@api_router.get("/health-records/{pet_id}", response_model=List[HealthRecord])
async def get_health_records(pet_id: str, current_user: dict = Depends(get_current_user)):
    pet = await db.pets.find_one({"id": pet_id, "owner_id": current_user["id"]})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    records = await db.health_records.find({"pet_id": pet_id}).to_list(100)
    return [HealthRecord(**r) for r in records]

# ========================= VETS =========================

@api_router.get("/vets", response_model=List[Vet])
async def get_vets(city: Optional[str] = None, specialty: Optional[str] = None):
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if specialty:
        query["specialty"] = specialty
    
    vets = await db.vets.find(query).to_list(100)
    return [Vet(**v) for v in vets]

@api_router.get("/vets/{vet_id}", response_model=Vet)
async def get_vet(vet_id: str):
    vet = await db.vets.find_one({"id": vet_id})
    if not vet:
        raise HTTPException(status_code=404, detail="Vet not found")
    return Vet(**vet)

# ========================= APPOINTMENTS =========================

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(apt: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    appointment = Appointment(**apt.dict(), user_id=current_user["id"])
    await db.appointments.insert_one(appointment.dict())
    return appointment

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(current_user: dict = Depends(get_current_user)):
    appointments = await db.appointments.find({
        "$or": [
            {"user_id": current_user["id"]},
            {"vet_id": current_user["id"]}
        ]
    }).sort("created_at", -1).to_list(100)
    return [Appointment(**a) for a in appointments]

@api_router.get("/appointments/{appointment_id}")
async def get_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    appointment = await db.appointments.find_one({
        "id": appointment_id,
        "$or": [
            {"user_id": current_user["id"]},
            {"vet_id": current_user["id"]}
        ]
    })
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return Appointment(**appointment)

@api_router.put("/appointments/{appointment_id}/cancel")
async def cancel_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.appointments.update_one(
        {"id": appointment_id, "user_id": current_user["id"]},
        {"$set": {"status": "cancelled"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"message": "Appointment cancelled"}

# ========================= CART =========================

class CartItemAdd(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int = 1
    image: Optional[str] = None

class CartItemUpdate(BaseModel):
    quantity: int

@api_router.get("/cart")
async def get_cart(current_user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user["id"]})
    if not cart:
        return {"items": [], "total": 0}
    
    total = sum(item["price"] * item["quantity"] for item in cart.get("items", []))
    return {"items": cart.get("items", []), "total": total}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItemAdd, current_user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user["id"]})
    
    if not cart:
        # Create new cart
        cart = {
            "user_id": current_user["id"],
            "items": [item.dict()],
            "created_at": datetime.utcnow()
        }
        await db.carts.insert_one(cart)
    else:
        # Check if item already in cart
        existing_item = next(
            (i for i in cart.get("items", []) if i["product_id"] == item.product_id),
            None
        )
        
        if existing_item:
            # Update quantity
            await db.carts.update_one(
                {"user_id": current_user["id"], "items.product_id": item.product_id},
                {"$inc": {"items.$.quantity": item.quantity}}
            )
        else:
            # Add new item
            await db.carts.update_one(
                {"user_id": current_user["id"]},
                {"$push": {"items": item.dict()}}
            )
    
    return {"message": "Item added to cart"}

@api_router.put("/cart/update/{product_id}")
async def update_cart_item(product_id: str, update_data: CartItemUpdate, current_user: dict = Depends(get_current_user)):
    if update_data.quantity <= 0:
        # Remove item if quantity is 0 or less
        await db.carts.update_one(
            {"user_id": current_user["id"]},
            {"$pull": {"items": {"product_id": product_id}}}
        )
        return {"message": "Item removed from cart"}
    
    result = await db.carts.update_one(
        {"user_id": current_user["id"], "items.product_id": product_id},
        {"$set": {"items.$.quantity": update_data.quantity}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    
    return {"message": "Cart updated"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.carts.update_one(
        {"user_id": current_user["id"]},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    return {"message": "Item removed from cart"}

@api_router.delete("/cart/clear")
async def clear_cart(current_user: dict = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"items": []}}
    )
    return {"message": "Cart cleared"}

# ========================= ORDERS (SHOP CHECKOUT) =========================

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    enriched_items = []
    for item in order_data.items:
        item_data = item.dict()
        listing = await db.marketplace_listings.find_one({"id": item.product_id})
        if listing:
            item_data["seller_user_id"] = listing.get("user_id")
        enriched_items.append(OrderItem(**item_data))

    order_payload = order_data.dict()
    order_payload["items"] = [i.dict() for i in enriched_items]
    order = Order(**order_payload, user_id=current_user["id"])
    await db.orders.insert_one(order.dict())
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(100)
    return [Order(**o) for o in orders]

@api_router.get("/orders/sales", response_model=List[Order])
async def get_sales_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"items": {"$elemMatch": {"seller_user_id": current_user["id"]}}}).sort("created_at", -1).to_list(200)
    return [Order(**o) for o in orders]

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

# ========================= CONVERSATIONS (CHAT) =========================

@api_router.post("/conversations")
async def create_conversation(data: ConversationCreate, current_user: dict = Depends(get_current_user)):
    # Basic validation
    if data.other_user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot start a conversation with yourself")

    initial_message = (data.initial_message or "").strip()
    if not initial_message:
        raise HTTPException(status_code=400, detail="Initial message cannot be empty")

    # Verify other user exists
    other_user = await db.users.find_one({"id": data.other_user_id})
    if not other_user:
        raise HTTPException(status_code=404, detail="Recipient user not found")

    blocked = await db.blocked_users.find_one({"$or": [
        {"user_id": current_user["id"], "blocked_user_id": data.other_user_id},
        {"user_id": data.other_user_id, "blocked_user_id": current_user["id"]},
    ]})
    if blocked:
        raise HTTPException(status_code=403, detail="Cannot message this user")

    # Check if 1:1 conversation already exists (exactly two participants)
    existing = await db.conversations.find_one({
        "participants": {"$all": [current_user["id"], data.other_user_id]},
        "$expr": {"$eq": [{"$size": "$participants"}, 2]}
    })

    if existing:
        # Add message to existing conversation
        chat_msg = ChatMessage(
            conversation_id=existing["id"],
            sender_id=current_user["id"],
            content=initial_message
        )
        await db.chat_messages.insert_one(chat_msg.dict())
        await db.conversations.update_one(
            {"id": existing["id"]},
            {"$set": {"last_message": initial_message, "last_message_time": datetime.utcnow()}}
        )

        await notify_conversation_participants(
            existing["id"],
            "new_message",
            {"message": chat_msg.dict(), "is_new_conversation": False},
        )
        await notify_conversation_participants(existing["id"], "conversations_updated", {})

        return {"conversation_id": existing["id"], "is_new": False}

    other_settings = await db.user_settings.find_one({"user_id": data.other_user_id})
    direct_policy = (other_settings or {}).get("allow_direct_messages", "everyone")
    if direct_policy == "friends_only":
        is_friend = await db.friendships.find_one({"users": {"$all": [current_user["id"], data.other_user_id]}})
        if not is_friend:
            raise HTTPException(status_code=403, detail="This user accepts messages from friends only")

    # Create new conversation
    conversation = Conversation(
        participants=[current_user["id"], data.other_user_id],
        pet_id=data.pet_id,
        last_message=initial_message,
        last_message_time=datetime.utcnow()
    )
    await db.conversations.insert_one(conversation.dict())

    # Add initial message
    chat_msg = ChatMessage(
        conversation_id=conversation.id,
        sender_id=current_user["id"],
        content=initial_message
    )
    await db.chat_messages.insert_one(chat_msg.dict())

    await notify_conversation_participants(
        conversation.id,
        "new_message",
        {"message": chat_msg.dict(), "is_new_conversation": True},
    )
    await notify_conversation_participants(conversation.id, "conversations_updated", {})

    return {"conversation_id": conversation.id, "is_new": True}

@api_router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    conversations = await db.conversations.find({
        "participants": current_user["id"]
    }).sort("last_message_time", -1).to_list(100)
    
    # Enrich with user info
    result = []
    for conv in conversations:
        other_candidates = [p for p in conv.get("participants", []) if p != current_user["id"]]
        other_user_id = other_candidates[0] if other_candidates else None
        other_user = await db.users.find_one({"id": other_user_id}) if other_user_id else None
        
        # Get unread count
        unread = await db.chat_messages.count_documents({
            "conversation_id": conv["id"],
            "sender_id": {"$ne": current_user["id"]},
            "is_read": False
        })
        
        # Create a clean dict without MongoDB ObjectId
        clean_conv = {
            "id": conv["id"],
            "participants": conv["participants"],
            "pet_id": conv.get("pet_id"),
            "last_message": conv.get("last_message"),
            "last_message_time": conv.get("last_message_time"),
            "created_at": conv["created_at"],
            "other_user": {
                "id": other_user["id"] if other_user else None,
                "name": other_user["name"] if other_user else "Unknown",
                "avatar": other_user.get("avatar") if other_user else None,
                "is_online": chat_ws_manager.is_online(other_user["id"]) if other_user else False,
            },
            "unread_count": unread
        }
        result.append(clean_conv)
    
    return result

@api_router.get('/friends/search')
async def search_users_for_friends(q: str = '', current_user: dict = Depends(get_current_user)):
    keyword = (q or '').strip()
    if len(keyword) < 2:
        return []

    blocked_rows = await db.blocked_users.find({"$or": [{"user_id": current_user["id"]}, {"blocked_user_id": current_user["id"]}]}).to_list(5000)
    blocked_ids = set()
    for row in blocked_rows:
        if row.get("user_id") == current_user["id"]:
            blocked_ids.add(row.get("blocked_user_id"))
        if row.get("blocked_user_id") == current_user["id"]:
            blocked_ids.add(row.get("user_id"))

    regex_query = {
        "$or": [
            {"name": {"$regex": keyword, "$options": "i"}},
            {"username": {"$regex": keyword, "$options": "i"}},
            {"user_code": {"$regex": keyword, "$options": "i"}},
        ],
        "id": {"$ne": current_user["id"], "$nin": list(blocked_ids)}
    }
    users = await db.users.find(regex_query).limit(30).to_list(30)

    outgoing = await db.friend_requests.find({"from_user_id": current_user["id"], "status": "pending"}).to_list(500)
    incoming = await db.friend_requests.find({"to_user_id": current_user["id"], "status": "pending"}).to_list(500)
    outgoing_set = {r.get("to_user_id") for r in outgoing}
    incoming_set = {r.get("from_user_id") for r in incoming}

    my_friend_ids = await get_friend_ids_set(current_user["id"])

    result = []
    for u in users:
        uid = u.get("id")
        target_friend_ids = await get_friend_ids_set(uid)
        mutual_count = len(my_friend_ids.intersection(target_friend_ids))
        result.append({
            "id": uid,
            "name": u.get("name"),
            "avatar": u.get("avatar"),
            "username": u.get("username") or normalize_username(u.get("name") or "user"),
            "user_code": u.get("user_code") or generate_user_code(uid or ""),
            "mutual_count": mutual_count,
            "friendship_status": "friends" if uid in my_friend_ids else (
                "outgoing_pending" if uid in outgoing_set else (
                    "incoming_pending" if uid in incoming_set else "none"
                )
            )
        })
    return result

@api_router.get('/friends')
async def get_friends(current_user: dict = Depends(get_current_user)):
    rows = await db.friendships.find({"users": current_user["id"]}).sort("created_at", -1).to_list(2000)
    friend_ids = []
    for fr in rows:
        for uid in fr.get("users", []):
            if uid != current_user["id"]:
                friend_ids.append(uid)
    if not friend_ids:
        return []
    users = await db.users.find({"id": {"$in": friend_ids}}).to_list(2000)
    umap = {u.get("id"): u for u in users}
    my_friend_ids = await get_friend_ids_set(current_user["id"])
    result = []
    for uid in friend_ids:
        target_friend_ids = await get_friend_ids_set(uid)
        mutual_count = len(my_friend_ids.intersection(target_friend_ids))
        result.append({
            "id": uid,
            "name": umap.get(uid, {}).get("name", "Unknown"),
            "avatar": umap.get(uid, {}).get("avatar"),
            "username": umap.get(uid, {}).get("username") or normalize_username(umap.get(uid, {}).get("name") or "user"),
            "user_code": umap.get(uid, {}).get("user_code") or generate_user_code(uid),
            "mutual_count": mutual_count,
            "is_online": chat_ws_manager.is_online(uid),
        })
    return result

@api_router.get('/friends/requests')
async def get_friend_requests(current_user: dict = Depends(get_current_user)):
    incoming = await db.friend_requests.find({"to_user_id": current_user["id"], "status": "pending"}).sort("created_at", -1).to_list(300)
    outgoing = await db.friend_requests.find({"from_user_id": current_user["id"], "status": "pending"}).sort("created_at", -1).to_list(300)

    incoming_user_ids = [r.get("from_user_id") for r in incoming if r.get("from_user_id")]
    outgoing_user_ids = [r.get("to_user_id") for r in outgoing if r.get("to_user_id")]
    users = await db.users.find({"id": {"$in": list(set(incoming_user_ids + outgoing_user_ids))}}).to_list(1000)
    umap = {u.get("id"): u for u in users}

    return {
        "incoming": [{
            "id": r.get("id"),
            "message": r.get("message"),
            "created_at": r.get("created_at"),
            "user": {
                "id": r.get("from_user_id"),
                "name": umap.get(r.get("from_user_id"), {}).get("name", "Unknown"),
                "avatar": umap.get(r.get("from_user_id"), {}).get("avatar"),
                "username": umap.get(r.get("from_user_id"), {}).get("username") or normalize_username(umap.get(r.get("from_user_id"), {}).get("name") or "user"),
                "user_code": umap.get(r.get("from_user_id"), {}).get("user_code") or generate_user_code(r.get("from_user_id") or ""),
            }
        } for r in incoming],
        "outgoing": [{
            "id": r.get("id"),
            "message": r.get("message"),
            "created_at": r.get("created_at"),
            "user": {
                "id": r.get("to_user_id"),
                "name": umap.get(r.get("to_user_id"), {}).get("name", "Unknown"),
                "avatar": umap.get(r.get("to_user_id"), {}).get("avatar"),
                "username": umap.get(r.get("to_user_id"), {}).get("username") or normalize_username(umap.get(r.get("to_user_id"), {}).get("name") or "user"),
                "user_code": umap.get(r.get("to_user_id"), {}).get("user_code") or generate_user_code(r.get("to_user_id") or ""),
            }
        } for r in outgoing]
    }

@api_router.post('/friends/requests')
async def send_friend_request(payload: dict, current_user: dict = Depends(get_current_user)):
    target_user_id = payload.get('target_user_id')
    if not target_user_id or target_user_id == current_user['id']:
        raise HTTPException(status_code=400, detail='Invalid target user')

    target = await db.users.find_one({'id': target_user_id})
    if not target:
        raise HTTPException(status_code=404, detail='User not found')

    blocked = await db.blocked_users.find_one({"$or": [
        {"user_id": current_user["id"], "blocked_user_id": target_user_id},
        {"user_id": target_user_id, "blocked_user_id": current_user["id"]}
    ]})
    if blocked:
        raise HTTPException(status_code=403, detail='Cannot send request to this user')

    target_settings = await db.user_settings.find_one({"user_id": target_user_id})
    allow_requests = (target_settings or {}).get("allow_friend_requests", "everyone")
    if allow_requests == "nobody":
        raise HTTPException(status_code=403, detail='This user is not accepting friend requests')

    existing_friend = await db.friendships.find_one({"users": {"$all": [current_user["id"], target_user_id]}})
    if existing_friend:
        return {"success": True, "status": "already_friends"}

    existing = await db.friend_requests.find_one({
        "from_user_id": current_user["id"],
        "to_user_id": target_user_id,
        "status": "pending"
    })
    if existing:
        return {"success": True, "status": "pending", "request_id": existing.get("id")}

    reverse = await db.friend_requests.find_one({
        "from_user_id": target_user_id,
        "to_user_id": current_user["id"],
        "status": "pending"
    })
    if reverse:
        # auto-accept reverse request
        await db.friend_requests.update_one({"id": reverse.get("id")}, {"$set": {"status": "accepted", "updated_at": datetime.utcnow()}})
        await db.friendships.insert_one({
            "id": str(uuid.uuid4()),
            "users": [current_user["id"], target_user_id],
            "created_at": datetime.utcnow(),
        })
        return {"success": True, "status": "friends"}

    row = {
        "id": str(uuid.uuid4()),
        "from_user_id": current_user["id"],
        "to_user_id": target_user_id,
        "message": (payload.get('message') or '').strip() or None,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    await db.friend_requests.insert_one(row)
    await create_notification(
        target_user_id,
        "New friend request",
        f"{current_user.get('name', 'Someone')} sent you a friend request.",
        "friend_request",
        {"route": "/friends", "request_id": row["id"]}
    )
    return {"success": True, "status": "pending", "request_id": row["id"]}

@api_router.put('/friends/requests/{request_id}')
async def review_friend_request(request_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    action = (payload.get('action') or '').strip().lower()
    if action not in {'accept', 'reject'}:
        raise HTTPException(status_code=400, detail='Invalid action')

    req = await db.friend_requests.find_one({"id": request_id, "to_user_id": current_user["id"], "status": "pending"})
    if not req:
        raise HTTPException(status_code=404, detail='Friend request not found')

    new_status = 'accepted' if action == 'accept' else 'rejected'
    await db.friend_requests.update_one({"id": request_id}, {"$set": {"status": new_status, "updated_at": datetime.utcnow()}})

    if action == 'accept':
        existing_friend = await db.friendships.find_one({"users": {"$all": [current_user["id"], req.get("from_user_id")]}})
        if not existing_friend:
            await db.friendships.insert_one({
                "id": str(uuid.uuid4()),
                "users": [current_user["id"], req.get("from_user_id")],
                "created_at": datetime.utcnow(),
            })

    await create_notification(
        req.get("from_user_id"),
        "Friend request update",
        f"{current_user.get('name', 'User')} {new_status} your friend request.",
        "friend_request",
        {"route": "/friends", "request_id": request_id, "status": new_status}
    )

    return {"success": True, "status": new_status}

@api_router.get('/friends/blocked')
async def get_blocked_users_in_friends(current_user: dict = Depends(get_current_user)):
    rows = await db.blocked_users.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(1000)
    ids = [r.get("blocked_user_id") for r in rows if r.get("blocked_user_id")]
    users = await db.users.find({"id": {"$in": ids}}).to_list(1000)
    umap = {u.get("id"): u for u in users}
    return [{
        "id": uid,
        "name": umap.get(uid, {}).get("name", "Unknown"),
        "avatar": umap.get(uid, {}).get("avatar"),
        "username": umap.get(uid, {}).get("username") or normalize_username(umap.get(uid, {}).get("name") or "user"),
        "user_code": umap.get(uid, {}).get("user_code") or generate_user_code(uid),
    } for uid in ids]

@api_router.post('/friends/{target_user_id}/block')
async def block_user_in_friends(target_user_id: str, current_user: dict = Depends(get_current_user)):
    if target_user_id == current_user['id']:
        raise HTTPException(status_code=400, detail='Cannot block yourself')

    target = await db.users.find_one({"id": target_user_id})
    if not target:
        raise HTTPException(status_code=404, detail='User not found')

    existing = await db.blocked_users.find_one({"user_id": current_user["id"], "blocked_user_id": target_user_id})
    if not existing:
        await db.blocked_users.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "blocked_user_id": target_user_id,
            "created_at": datetime.utcnow(),
        })

    await db.friend_requests.delete_many({"$or": [
        {"from_user_id": current_user["id"], "to_user_id": target_user_id},
        {"from_user_id": target_user_id, "to_user_id": current_user["id"]},
    ]})
    await db.friendships.delete_many({"users": {"$all": [current_user["id"], target_user_id]}})
    return {"success": True}

@api_router.delete('/friends/{target_user_id}/block')
async def unblock_user_in_friends(target_user_id: str, current_user: dict = Depends(get_current_user)):
    await db.blocked_users.delete_one({"user_id": current_user["id"], "blocked_user_id": target_user_id})
    return {"success": True}

@api_router.post('/friends/report')
async def report_user_in_friends(payload: dict, current_user: dict = Depends(get_current_user)):
    target_user_id = payload.get('target_user_id')
    reason = (payload.get('reason') or 'abuse').strip()
    notes = payload.get('notes')
    if not target_user_id or target_user_id == current_user['id']:
        raise HTTPException(status_code=400, detail='Invalid target user')

    target = await db.users.find_one({"id": target_user_id})
    if not target:
        raise HTTPException(status_code=404, detail='User not found')

    await db.friend_reports.insert_one({
        "id": str(uuid.uuid4()),
        "reported_by": current_user["id"],
        "target_user_id": target_user_id,
        "reason": reason,
        "notes": notes,
        "status": "open",
        "created_at": datetime.utcnow(),
    })
    await create_notifications_for_admins(
        "User reported",
        f"{current_user.get('name', 'User')} reported a user profile.",
        "admin",
        {"route": "/admin/users", "target_user_id": target_user_id}
    )
    return {"success": True}

@api_router.get('/admin/friend-reports')
async def get_friend_reports_admin(target_user_id: Optional[str] = None, status: Optional[str] = None, admin_user: dict = Depends(get_admin_user)):
    query: dict = {}
    if target_user_id:
        query["target_user_id"] = target_user_id
    if status:
        query["status"] = status
    rows = await db.friend_reports.find(query).sort("created_at", -1).to_list(1000)
    uids = list({r.get("reported_by") for r in rows if r.get("reported_by")} | {r.get("target_user_id") for r in rows if r.get("target_user_id")})
    users = await db.users.find({"id": {"$in": uids}}).to_list(2000)
    umap = {u.get("id"): u for u in users}
    result = []
    for r in rows:
        result.append({
            "id": r.get("id"),
            "reason": r.get("reason"),
            "notes": r.get("notes"),
            "status": r.get("status", "open"),
            "created_at": r.get("created_at"),
            "reported_by": {
                "id": r.get("reported_by"),
                "name": umap.get(r.get("reported_by"), {}).get("name", "Unknown"),
                "email": umap.get(r.get("reported_by"), {}).get("email"),
            },
            "target_user": {
                "id": r.get("target_user_id"),
                "name": umap.get(r.get("target_user_id"), {}).get("name", "Unknown"),
                "email": umap.get(r.get("target_user_id"), {}).get("email"),
            },
            "reviewed_at": r.get("reviewed_at"),
            "reviewed_by": r.get("reviewed_by"),
        })
    return result

@api_router.put('/admin/friend-reports/{report_id}')
async def review_friend_report_admin(report_id: str, payload: dict, admin_user: dict = Depends(get_admin_user)):
    action = (payload.get('action') or '').strip().lower()  # resolve|reject|block_target
    if action not in {'resolve', 'reject', 'block_target'}:
        raise HTTPException(status_code=400, detail='Invalid action')

    report = await db.friend_reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')

    status_val = 'resolved' if action in {'resolve', 'block_target'} else 'rejected'

    if action == 'block_target':
        target_user_id = report.get('target_user_id')
        reporter_id = report.get('reported_by')
        if target_user_id and reporter_id:
            existing = await db.blocked_users.find_one({"user_id": reporter_id, "blocked_user_id": target_user_id})
            if not existing:
                await db.blocked_users.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": reporter_id,
                    "blocked_user_id": target_user_id,
                    "created_at": datetime.utcnow(),
                })

    await db.friend_reports.update_one(
        {"id": report_id},
        {"$set": {
            "status": status_val,
            "review_action": action,
            "reviewed_at": datetime.utcnow(),
            "reviewed_by": admin_user.get("id"),
        }}
    )
    await audit_admin_action(admin_user, "review_friend_report", "friend_report", report_id, {"action": action, "status": status_val})
    return {"success": True, "status": status_val}

@api_router.post('/conversations/direct/{other_user_id}')
async def start_direct_conversation(other_user_id: str, current_user: dict = Depends(get_current_user)):
    if other_user_id == current_user['id']:
        raise HTTPException(status_code=400, detail='Cannot chat with yourself')

    blocked = await db.blocked_users.find_one({"$or": [
        {"user_id": current_user["id"], "blocked_user_id": other_user_id},
        {"user_id": other_user_id, "blocked_user_id": current_user["id"]},
    ]})
    if blocked:
        raise HTTPException(status_code=403, detail='Cannot message this user')

    is_friend = await db.friendships.find_one({"users": {"$all": [current_user["id"], other_user_id]}})
    if not is_friend:
        raise HTTPException(status_code=403, detail='You can only chat with friends')

    other_user = await db.users.find_one({"id": other_user_id})
    if not other_user:
        raise HTTPException(status_code=404, detail='User not found')

    existing = await db.conversations.find_one({
        "participants": {"$all": [current_user["id"], other_user_id]},
        "$expr": {"$eq": [{"$size": "$participants"}, 2]}
    })
    if existing:
        return {"conversation_id": existing["id"], "is_new": False}

    conversation = Conversation(
        participants=[current_user["id"], other_user_id],
        pet_id=None,
        last_message=None,
        last_message_time=datetime.utcnow(),
    )
    await db.conversations.insert_one(conversation.dict())
    await notify_conversation_participants(conversation.id, "conversations_updated", {})
    return {"conversation_id": conversation.id, "is_new": True}

@api_router.get("/conversations/{conversation_id}/messages")
async def get_chat_messages(conversation_id: str, current_user: dict = Depends(get_current_user)):
    # Verify user is participant
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participants": current_user["id"]
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Mark messages as read
    read_result = await db.chat_messages.update_many(
        {"conversation_id": conversation_id, "sender_id": {"$ne": current_user["id"]}, "is_read": False},
        {"$set": {"is_read": True}}
    )

    if read_result.modified_count > 0:
        await notify_conversation_participants(
            conversation_id,
            "messages_read",
            {"reader_id": current_user["id"]},
        )

    messages = await db.chat_messages.find({"conversation_id": conversation_id}).sort("created_at", 1).to_list(200)
    return [ChatMessage(**m) for m in messages]

@api_router.post("/conversations/{conversation_id}/read")
async def mark_conversation_read(conversation_id: str, current_user: dict = Depends(get_current_user)):
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participants": current_user["id"]
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    read_result = await db.chat_messages.update_many(
        {"conversation_id": conversation_id, "sender_id": {"$ne": current_user["id"]}, "is_read": False},
        {"$set": {"is_read": True}}
    )

    if read_result.modified_count > 0:
        await notify_conversation_participants(
            conversation_id,
            "messages_read",
            {"reader_id": current_user["id"]},
        )

    return {"updated": int(read_result.modified_count)}

@api_router.post("/conversations/{conversation_id}/messages")
async def send_chat_message(conversation_id: str, content: str, current_user: dict = Depends(get_current_user)):
    # Verify user is participant
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participants": current_user["id"]
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    clean_content = (content or "").strip()
    if not clean_content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    chat_msg = ChatMessage(
        conversation_id=conversation_id,
        sender_id=current_user["id"],
        content=clean_content
    )
    await db.chat_messages.insert_one(chat_msg.dict())
    
    # Update conversation
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"last_message": clean_content, "last_message_time": datetime.utcnow()}}
    )

    await notify_conversation_participants(
        conversation_id,
        "new_message",
        {"message": chat_msg.dict(), "is_new_conversation": False},
    )
    await notify_conversation_participants(conversation_id, "conversations_updated", {})

    return chat_msg

# ========================= MAP LOCATIONS =========================

@api_router.get("/map-locations", response_model=List[MapLocation])
async def get_map_locations(
    type: Optional[str] = None,
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: float = 50
):
    query = {}
    if type:
        query["type"] = type
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    locations = await db.map_locations.find(query).to_list(100)
    return [MapLocation(**loc) for loc in locations]

# ========================= PRODUCTS (SHOP) =========================

@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    pet_type: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    query = {}
    if category:
        query["category"] = category
    if pet_type:
        query["pet_type"] = pet_type
    
    products = await db.products.find(query).skip(skip).limit(limit).to_list(limit)
    return [Product(**p) for p in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

# ========================= EMERGENCY CONTACTS =========================

@api_router.get("/emergency-contacts", response_model=List[EmergencyContact])
async def get_emergency_contacts(city: Optional[str] = None):
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    contacts = await db.emergency_contacts.find(query).to_list(100)
    return [EmergencyContact(**c) for c in contacts]

# ========================= MESSAGES =========================

@api_router.post("/messages", response_model=Message)
async def send_message(msg: MessageBase, current_user: dict = Depends(get_current_user)):
    message = Message(**msg.dict(), sender_id=current_user["id"])
    await db.messages.insert_one(message.dict())
    return message

@api_router.get("/messages", response_model=List[Message])
async def get_messages(current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find({
        "$or": [
            {"sender_id": current_user["id"]},
            {"receiver_id": current_user["id"]}
        ]
    }).sort("created_at", -1).to_list(100)
    return [Message(**m) for m in messages]

@api_router.put("/messages/{message_id}/read")
async def mark_message_read(message_id: str, current_user: dict = Depends(get_current_user)):
    await db.messages.update_one(
        {"id": message_id, "receiver_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "Marked as read"}

# ========================= LOST & FOUND =========================

@api_router.post("/lost-found", response_model=LostFoundPost)
async def create_lost_found(post: LostFoundCreate, current_user: dict = Depends(get_current_user)):
    lost_found = LostFoundPost(**post.dict(), user_id=current_user["id"])
    await db.lost_found.insert_one(lost_found.dict())
    return lost_found

@api_router.get("/lost-found", response_model=List[LostFoundPost])
async def get_lost_found(type: Optional[str] = None, status: str = "active"):
    query = {"status": status}
    if type:
        query["type"] = type
    posts = await db.lost_found.find(query).sort("created_at", -1).to_list(100)
    return [LostFoundPost(**p) for p in posts]

@api_router.get("/lost-found/{post_id}", response_model=LostFoundPost)
async def get_lost_found_by_id(post_id: str):
    post = await db.lost_found.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return LostFoundPost(**post)

# ========================= COMMUNITY =========================

@api_router.post("/community", response_model=CommunityPost)
async def create_community_post(post: CommunityPostCreate, current_user: dict = Depends(get_current_user)):
    community_post = CommunityPost(
        **post.dict(),
        user_id=current_user["id"],
        user_name=current_user["name"],
        user_avatar=current_user.get("avatar")
    )
    await db.community.insert_one(community_post.dict())
    return community_post

@api_router.get("/community", response_model=List[CommunityPost])
async def get_community_posts(type: Optional[str] = None, limit: int = 50, current_user: Optional[dict] = Depends(get_current_user_optional)):
    query = {}
    if type:
        query["type"] = type

    # Hide posts from blocked users for the current user
    if current_user:
        blocked_rows = await db.blocked_users.find({"user_id": current_user["id"]}).to_list(1000)
        blocked_ids = [r.get("blocked_user_id") for r in blocked_rows if r.get("blocked_user_id")]
        if blocked_ids:
            query["user_id"] = {"$nin": blocked_ids}

    posts = await db.community.find(query).sort("created_at", -1).limit(limit).to_list(limit)

    enriched = []
    for p in posts:
      clean = {k: v for k, v in p.items() if k != "_id"}
      comments_count = await db.comments.count_documents({"post_id": clean.get("id")})
      clean["comments_count"] = comments_count
      clean["comments"] = comments_count
      enriched.append(CommunityPost(**clean))

    return enriched

@api_router.get("/community/post/{post_id}", response_model=CommunityPost)
async def get_community_post_by_id(post_id: str):
    post = await db.community.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    clean = {k: v for k, v in post.items() if k != "_id"}
    comments_count = await db.comments.count_documents({"post_id": clean.get("id")})
    clean["comments_count"] = comments_count
    clean["comments"] = comments_count
    return CommunityPost(**clean)

@api_router.post("/community/{post_id}/like")
async def like_community_post(post_id: str, current_user: dict = Depends(get_current_user)):
    await db.community.update_one({"id": post_id}, {"$inc": {"likes": 1}})
    return {"message": "Liked"}

@api_router.post("/community/{post_id}/report")
async def report_community_post(post_id: str, data: dict = {}, current_user: dict = Depends(get_current_user)):
    post = await db.community.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    row = {
        "id": str(uuid.uuid4()),
        "post_id": post_id,
        "reported_by": current_user["id"],
        "post_owner_id": post.get("user_id"),
        "reason": data.get("reason", "inappropriate"),
        "notes": data.get("notes"),
        "created_at": datetime.utcnow(),
    }
    await db.community_reports.insert_one(row)
    return {"message": "Report submitted"}

@api_router.post("/community/users/{target_user_id}/block")
async def block_community_user(target_user_id: str, current_user: dict = Depends(get_current_user)):
    if target_user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    existing = await db.blocked_users.find_one({"user_id": current_user["id"], "blocked_user_id": target_user_id})
    if not existing:
        await db.blocked_users.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "blocked_user_id": target_user_id,
            "created_at": datetime.utcnow(),
        })
    return {"message": "User blocked"}

@api_router.delete("/community/users/{target_user_id}/block")
async def unblock_community_user(target_user_id: str, current_user: dict = Depends(get_current_user)):
    await db.blocked_users.delete_one({"user_id": current_user["id"], "blocked_user_id": target_user_id})
    return {"message": "User unblocked"}

@api_router.get("/community/blocked-users")
async def get_blocked_users(current_user: dict = Depends(get_current_user)):
    rows = await db.blocked_users.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(1000)
    result = []
    for r in rows:
        uid = r.get("blocked_user_id")
        u = await db.users.find_one({"id": uid})
        result.append({
            "user_id": uid,
            "name": (u or {}).get("name", "Unknown"),
            "avatar": (u or {}).get("avatar"),
            "blocked_at": r.get("created_at"),
        })
    return result

@api_router.post("/community/{post_id}/notify")
async def enable_post_notifications(post_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.community_post_notifications.find_one({"user_id": current_user["id"], "post_id": post_id})
    if not existing:
        await db.community_post_notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "post_id": post_id,
            "created_at": datetime.utcnow(),
        })
    return {"message": "Notifications enabled"}

@api_router.delete("/community/{post_id}/notify")
async def disable_post_notifications(post_id: str, current_user: dict = Depends(get_current_user)):
    await db.community_post_notifications.delete_one({"user_id": current_user["id"], "post_id": post_id})
    return {"message": "Notifications disabled"}

@api_router.get("/community/notifications/subscriptions")
async def get_notification_subscriptions(current_user: dict = Depends(get_current_user)):
    rows = await db.community_post_notifications.find({"user_id": current_user["id"]}).to_list(2000)
    return [r.get("post_id") for r in rows if r.get("post_id")]

# ========================= COMMUNITY COMMENTS =========================

class CommentCreate(BaseModel):
    content: str
    parent_comment_id: Optional[str] = None

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    content: str
    likes: int = 0
    parent_comment_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

@api_router.post("/community/{post_id}/comments")
async def create_comment(post_id: str, comment: CommentCreate, current_user: dict = Depends(get_current_user)):
    new_comment = Comment(
        post_id=post_id,
        user_id=current_user["id"],
        user_name=current_user["name"],
        user_avatar=current_user.get("avatar"),
        content=comment.content,
        parent_comment_id=comment.parent_comment_id
    )
    await db.comments.insert_one(new_comment.dict())
    await db.community.update_one({"id": post_id}, {"$inc": {"comments": 1}})
    return new_comment

@api_router.get("/community/{post_id}/comments", response_model=List[Comment])
async def get_comments(post_id: str):
    comments = await db.comments.find({"post_id": post_id}).sort("created_at", 1).to_list(300)
    return [Comment(**{k: v for k, v in c.items() if k != "_id"}) for c in comments]

@api_router.post('/community/comments/{comment_id}/like')
async def like_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.comments.update_one({'id': comment_id}, {'$inc': {'likes': 1}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Comment not found')
    return {'message': 'Comment liked'}

# ========================= HEALTH RECORDS =========================

class HealthRecordCreate(BaseModel):
    pet_id: str
    record_type: str  # vaccination, vet_visit, medication, weight, other
    title: str
    description: Optional[str] = None
    date: str
    vet_name: Optional[str] = None
    clinic_name: Optional[str] = None
    next_due_date: Optional[str] = None
    notes: Optional[str] = None
    attachments: Optional[List[str]] = []

class HealthRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pet_id: str
    user_id: str
    record_type: str
    title: str
    description: Optional[str] = None
    date: str
    vet_name: Optional[str] = None
    clinic_name: Optional[str] = None
    next_due_date: Optional[str] = None
    notes: Optional[str] = None
    attachments: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

@api_router.post("/health-records")
async def create_health_record(record: HealthRecordCreate, current_user: dict = Depends(get_current_user)):
    # Verify pet belongs to user
    pet = await db.pets.find_one({"id": record.pet_id, "owner_id": current_user["id"]})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    record_dict = record.dict()
    record_dict["user_id"] = current_user["id"]
    record_dict["id"] = str(uuid.uuid4())
    record_dict["created_at"] = datetime.utcnow()
    
    await db.health_records.insert_one(record_dict)
    return record_dict

@api_router.get("/health-records/{pet_id}")
async def get_health_records(pet_id: str, current_user: dict = Depends(get_current_user)):
    records = await db.health_records.find({"pet_id": pet_id}).sort("date", -1).to_list(100)
    return records

@api_router.delete("/health-records/{record_id}")
async def delete_health_record(record_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.health_records.delete_one({"id": record_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Record deleted"}

# ========================= FAVORITES =========================

@api_router.post("/favorites/{item_type}/{item_id}")
async def add_favorite(item_type: str, item_id: str, current_user: dict = Depends(get_current_user)):
    """Add pet or product to favorites. item_type: 'pet' or 'product'"""
    favorite = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "item_type": item_type,
        "item_id": item_id,
        "created_at": datetime.utcnow()
    }
    # Check if already favorited
    existing = await db.favorites.find_one({
        "user_id": current_user["id"],
        "item_type": item_type,
        "item_id": item_id
    })
    if existing:
        return {"message": "Already in favorites", "is_favorite": True}
    
    await db.favorites.insert_one(favorite)
    return {"message": "Added to favorites", "is_favorite": True}

@api_router.delete("/favorites/{item_type}/{item_id}")
async def remove_favorite(item_type: str, item_id: str, current_user: dict = Depends(get_current_user)):
    await db.favorites.delete_one({
        "user_id": current_user["id"],
        "item_type": item_type,
        "item_id": item_id
    })
    return {"message": "Removed from favorites", "is_favorite": False}

@api_router.get("/favorites")
async def get_favorites(item_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    # Read all user favorites then normalize legacy/new shapes
    raw_favorites = await db.favorites.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(100)

    result = []
    for fav in raw_favorites:
        normalized_type = fav.get("item_type")
        normalized_id = fav.get("item_id")

        # Legacy compatibility
        if not normalized_type:
            if fav.get("pet_id"):
                normalized_type = "pet"
                normalized_id = fav.get("pet_id")
            elif fav.get("product_id"):
                normalized_type = "product"
                normalized_id = fav.get("product_id")

        if not normalized_type or not normalized_id:
            continue

        if item_type and normalized_type != item_type:
            continue

        if normalized_type == "pet":
            item = await db.pets.find_one({"id": normalized_id})
        else:
            item = await db.products.find_one({"id": normalized_id})

        if item:
            fav_clean = {k: v for k, v in fav.items() if k != "_id"}
            item_clean = {k: v for k, v in item.items() if k != "_id"}
            result.append({
                **fav_clean,
                "item_type": normalized_type,
                "item_id": normalized_id,
                "item": item_clean,
            })
    return result

# ========================= SPONSORSHIP =========================

class SponsorshipCreate(BaseModel):
    pet_id: str
    amount: float
    message: Optional[str] = None
    is_anonymous: bool = False
    is_recurring: bool = False

class Sponsorship(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pet_id: str
    user_id: str
    user_name: Optional[str] = None
    amount: float
    message: Optional[str] = None
    is_anonymous: bool = False
    is_recurring: bool = False
    status: str = "pending"  # pending, completed, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MarketplaceListingCreate(BaseModel):
    title: str
    description: str
    category: str  # pets, accessories, services
    price: float
    location: str
    image: Optional[str] = None
    pet_type: Optional[str] = None
    condition: Optional[str] = None

class MarketplaceListing(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    title: str
    description: str
    category: str
    price: float
    location: str
    image: Optional[str] = None
    pet_type: Optional[str] = None
    condition: Optional[str] = None
    status: str = "active"  # active, sold, archived
    created_at: datetime = Field(default_factory=datetime.utcnow)

@api_router.post("/sponsorships")
async def create_sponsorship(sponsorship: SponsorshipCreate, current_user: dict = Depends(get_current_user)):
    new_sponsorship = Sponsorship(
        **sponsorship.dict(),
        user_id=current_user["id"],
        user_name=None if sponsorship.is_anonymous else current_user["name"]
    )
    await db.sponsorships.insert_one(new_sponsorship.dict())
    
    # Update pet's sponsorship total
    await db.pets.update_one(
        {"id": sponsorship.pet_id},
        {"$inc": {"total_sponsorship": sponsorship.amount}}
    )
    return new_sponsorship

@api_router.get("/sponsorships/pet/{pet_id}")
async def get_pet_sponsorships(pet_id: str, current_user: dict = Depends(get_current_user)):
    pet = await db.pets.find_one({"id": pet_id})
    all_for_pet = await db.sponsorships.find({"pet_id": pet_id}).sort("created_at", -1).to_list(100)

    # Pet owner can inspect full lifecycle.
    if pet and pet.get("owner_id") == current_user["id"]:
        visible = all_for_pet[:50]
    else:
        # Other viewers: completed sponsorships + viewer's own entries.
        visible = [
            s for s in all_for_pet
            if s.get("status") == "completed" or s.get("user_id") == current_user["id"]
        ][:50]

    sanitized = []
    for s in visible:
        row = dict(s)
        row.pop("_id", None)
        sanitized.append(Sponsorship(**row))
    return sanitized

@api_router.get("/sponsorships/my")
async def get_my_sponsorships(current_user: dict = Depends(get_current_user)):
    sponsorships = await db.sponsorships.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(100)
    return [Sponsorship(**s) for s in sponsorships]

@api_router.put("/sponsorships/{sponsorship_id}/status")
async def update_sponsorship_status(sponsorship_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    new_status = (data or {}).get("status")
    if new_status not in {"pending", "completed", "cancelled"}:
        raise HTTPException(status_code=400, detail="Invalid sponsorship status")

    sponsorship = await db.sponsorships.find_one({"id": sponsorship_id})
    if not sponsorship:
        raise HTTPException(status_code=404, detail="Sponsorship not found")

    pet = await db.pets.find_one({"id": sponsorship.get("pet_id")})
    is_owner = pet and pet.get("owner_id") == current_user["id"]
    is_sponsor = sponsorship.get("user_id") == current_user["id"]
    if not (is_owner or is_sponsor or current_user.get("is_admin")):
        raise HTTPException(status_code=403, detail="Not allowed to update this sponsorship")

    await db.sponsorships.update_one({"id": sponsorship_id}, {"$set": {"status": new_status}})
    updated = await db.sponsorships.find_one({"id": sponsorship_id})
    return Sponsorship(**updated)

# ========================= MARKETPLACE =========================

@api_router.post("/marketplace/listings", response_model=MarketplaceListing)
async def create_marketplace_listing(payload: MarketplaceListingCreate, current_user: dict = Depends(get_current_user)):
    listing = MarketplaceListing(
        **payload.dict(),
        user_id=current_user["id"],
        user_name=current_user.get("name", "User"),
        user_avatar=current_user.get("avatar")
    )
    await db.marketplace_listings.insert_one(listing.dict())
    return listing

@api_router.get("/marketplace/listings", response_model=List[MarketplaceListing])
async def get_marketplace_listings(
    category: Optional[str] = None,
    q: Optional[str] = None,
    city: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    query: dict = {"status": {"$in": ["active", "sold"]}}
    if category and category != "all":
        query["category"] = category
    if city:
        query["location"] = {"$regex": city, "$options": "i"}
    if min_price is not None or max_price is not None:
        rng = {}
        if min_price is not None:
            rng["$gte"] = min_price
        if max_price is not None:
            rng["$lte"] = max_price
        query["price"] = rng

    if current_user:
        blocked_rows = await db.blocked_users.find({"user_id": current_user["id"]}).to_list(1000)
        blocked_ids = [r.get("blocked_user_id") for r in blocked_rows if r.get("blocked_user_id")]
        if blocked_ids:
            query["user_id"] = {"$nin": blocked_ids}

    rows = await db.marketplace_listings.find(query).sort("created_at", -1).to_list(200)

    if q:
        ql = q.lower().strip()
        rows = [
            r for r in rows
            if ql in f"{r.get('title','')} {r.get('description','')} {r.get('location','')}".lower()
        ]

    clean_rows = [{k: v for k, v in r.items() if k != "_id"} for r in rows]
    return [MarketplaceListing(**r) for r in clean_rows]

@api_router.get("/marketplace/listings/my", response_model=List[MarketplaceListing])
async def get_my_marketplace_listings(current_user: dict = Depends(get_current_user)):
    rows = await db.marketplace_listings.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(200)
    clean_rows = [{k: v for k, v in r.items() if k != "_id"} for r in rows]
    return [MarketplaceListing(**r) for r in clean_rows]

@api_router.get("/marketplace/listings/{listing_id}", response_model=MarketplaceListing)
async def get_marketplace_listing_by_id(listing_id: str):
    row = await db.marketplace_listings.find_one({"id": listing_id})
    if not row:
        raise HTTPException(status_code=404, detail="Listing not found")
    clean_row = {k: v for k, v in row.items() if k != "_id"}
    return MarketplaceListing(**clean_row)

@api_router.put("/marketplace/listings/{listing_id}", response_model=MarketplaceListing)
async def update_marketplace_listing(listing_id: str, payload: MarketplaceListingCreate, current_user: dict = Depends(get_current_user)):
    row = await db.marketplace_listings.find_one({"id": listing_id})
    if not row:
        raise HTTPException(status_code=404, detail="Listing not found")
    if row.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    update_data = payload.dict()
    await db.marketplace_listings.update_one(
        {"id": listing_id},
        {"$set": {**update_data, "updated_at": datetime.utcnow()}}
    )
    updated = await db.marketplace_listings.find_one({"id": listing_id})
    return MarketplaceListing(**{k: v for k, v in updated.items() if k != "_id"})

@api_router.put("/marketplace/listings/{listing_id}/status")
async def set_marketplace_listing_status(listing_id: str, data: dict = {}, current_user: dict = Depends(get_current_user)):
    row = await db.marketplace_listings.find_one({"id": listing_id})
    if not row:
        raise HTTPException(status_code=404, detail="Listing not found")
    if row.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    status = data.get("status", "active")
    if status not in ["active", "sold", "archived"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    await db.marketplace_listings.update_one(
        {"id": listing_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    return {"message": "Status updated", "status": status}

@api_router.delete("/marketplace/listings/{listing_id}")
async def delete_marketplace_listing(listing_id: str, current_user: dict = Depends(get_current_user)):
    row = await db.marketplace_listings.find_one({"id": listing_id})
    if not row:
        raise HTTPException(status_code=404, detail="Listing not found")
    if row.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    await db.marketplace_listings.delete_one({"id": listing_id})
    return {"message": "Listing deleted"}

@api_router.post("/marketplace/listings/{listing_id}/report")
async def report_marketplace_listing(listing_id: str, data: dict = {}, current_user: dict = Depends(get_current_user)):
    row = await db.marketplace_listings.find_one({"id": listing_id})
    if not row:
        raise HTTPException(status_code=404, detail="Listing not found")

    await db.marketplace_reports.insert_one({
        "id": str(uuid.uuid4()),
        "listing_id": listing_id,
        "reported_by": current_user["id"],
        "listing_owner_id": row.get("user_id"),
        "reason": data.get("reason", "inappropriate"),
        "notes": data.get("notes"),
        "created_at": datetime.utcnow(),
    })
    return {"message": "Report submitted"}

# ========================= CARE REQUESTS / ROLE MODULES =========================

@api_router.post("/care-requests")
async def create_care_request(data: dict, current_user: dict = Depends(get_current_user)):
    now = datetime.utcnow()
    row = {
        "id": str(uuid.uuid4()),
        "pet_id": data.get("pet_id"),
        "title": data.get("title", "Care Request"),
        "description": data.get("description"),
        "location": data.get("location"),
        "priority": data.get("priority", "normal"),
        "status": "pending",  # pending, accepted, in_progress, completed, cancelled
        "requested_by": current_user["id"],
        "requested_by_name": current_user.get("name"),
        "assigned_vet_id": None,
        "assigned_clinic_id": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.care_requests.insert_one(row)
    await db.care_request_events.insert_one({
        "id": str(uuid.uuid4()),
        "request_id": row["id"],
        "actor_id": current_user["id"],
        "actor_name": current_user.get("name"),
        "actor_role": current_user.get("role", "user"),
        "event_type": "created",
        "status": "pending",
        "notes": row.get("description"),
        "created_at": now,
    })
    await create_notifications_for_admins(
        "New care request",
        f"{current_user.get('name', 'User')} submitted a care request.",
        "care_request",
        {"request_id": row["id"], "route": "/clinic-care-management"}
    )
    return {k: v for k, v in row.items() if k != "_id"}

@api_router.get("/vet/care-requests")
async def get_vet_care_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(require_roles("vet"))
):
    query: dict = {"$or": [{"assigned_vet_id": None}, {"assigned_vet_id": current_user["id"]}]}
    if status:
        query["status"] = status
    rows = await db.care_requests.find(query).sort("created_at", -1).to_list(200)
    return [{k: v for k, v in r.items() if k != "_id"} for r in rows]

@api_router.put("/vet/care-requests/{request_id}")
async def update_vet_care_request(request_id: str, data: dict, current_user: dict = Depends(require_roles("vet"))):
    existing = await db.care_requests.find_one({"id": request_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Care request not found")

    updates = {"updated_at": datetime.utcnow()}
    action = data.get("action")
    event_type = action or "status_update"
    if action == "accept":
        updates.update({"status": "accepted", "assigned_vet_id": current_user["id"]})
    elif action == "start":
        updates.update({"status": "in_progress", "assigned_vet_id": current_user["id"]})
    elif action == "complete":
        vet_notes = data.get("vet_notes")
        diagnosis = data.get("diagnosis")
        prescription = data.get("prescription")
        if not diagnosis or not str(diagnosis).strip() or not prescription or not str(prescription).strip():
            raise HTTPException(status_code=400, detail="Diagnosis and prescription are required to complete the case")
        updates.update({
            "status": "completed",
            "assigned_vet_id": current_user["id"],
            "vet_notes": vet_notes,
            "diagnosis": diagnosis,
            "prescription": prescription,
        })

        # Sync completion into pet health timeline when pet exists
        pet_id = existing.get("pet_id")
        if pet_id:
            pet = await db.pets.find_one({"id": pet_id})
            if pet:
                merged_notes = "\n".join([
                    f"Diagnosis: {diagnosis}" if diagnosis else "",
                    f"Prescription: {prescription}" if prescription else "",
                    f"Notes: {vet_notes}" if vet_notes else "",
                ]).strip()
                await db.health_records.insert_one({
                    "id": str(uuid.uuid4()),
                    "pet_id": pet_id,
                    "user_id": pet.get("owner_id"),
                    "record_type": "vet_visit",
                    "title": existing.get("title") or "Care Request Visit",
                    "description": existing.get("description") or "Care request was completed by vet",
                    "date": datetime.utcnow().strftime("%Y-%m-%d"),
                    "vet_name": current_user.get("name"),
                    "clinic_name": data.get("clinic_name") or existing.get("clinic_name"),
                    "notes": merged_notes,
                    "attachments": [],
                    "created_at": datetime.utcnow(),
                })
    elif data.get("status"):
        updates["status"] = data.get("status")

    await db.care_requests.update_one({"id": request_id}, {"$set": updates})
    await db.care_request_events.insert_one({
        "id": str(uuid.uuid4()),
        "request_id": request_id,
        "actor_id": current_user["id"],
        "actor_name": current_user.get("name"),
        "actor_role": current_user.get("role", "vet"),
        "event_type": event_type,
        "status": updates.get("status", existing.get("status")),
        "notes": data.get("vet_notes") or data.get("notes") or data.get("diagnosis"),
        "created_at": datetime.utcnow(),
    })

    row = await db.care_requests.find_one({"id": request_id})
    if row:
        await create_notification(
            row.get("requested_by"),
            "Care request updated",
            f"Your care request is now {row.get('status', 'updated')}.",
            "care_request",
            {"request_id": request_id, "status": row.get("status"), "route": "/clinic-care-management"}
        )
    return {k: v for k, v in row.items() if k != "_id"} if row else {"success": True}

@api_router.get("/clinic/care-requests")
async def get_clinic_care_requests(current_user: dict = Depends(require_roles("care_clinic"))):
    rows = await db.care_requests.find({}).sort("created_at", -1).to_list(300)
    return [{k: v for k, v in r.items() if k != "_id"} for r in rows]

@api_router.get("/clinic/vets")
async def get_clinic_vets(current_user: dict = Depends(require_roles("care_clinic"))):
    users = await db.users.find({"role": "vet"}).to_list(300)
    return [
        {
            "id": u.get("id"),
            "name": u.get("name"),
            "email": u.get("email"),
            "city": u.get("city"),
        }
        for u in users
    ]

@api_router.put("/clinic/care-requests/{request_id}")
async def update_clinic_care_request(request_id: str, data: dict, current_user: dict = Depends(require_roles("care_clinic"))):
    updates = {
        "updated_at": datetime.utcnow(),
        "assigned_clinic_id": current_user["id"],
    }
    if data.get("status"):
      updates["status"] = data.get("status")
    if data.get("assigned_vet_id"):
      updates["assigned_vet_id"] = data.get("assigned_vet_id")
    if data.get("clinic_notes") is not None:
      updates["clinic_notes"] = data.get("clinic_notes")

    await db.care_requests.update_one({"id": request_id}, {"$set": updates})
    await db.care_request_events.insert_one({
        "id": str(uuid.uuid4()),
        "request_id": request_id,
        "actor_id": current_user["id"],
        "actor_name": current_user.get("name"),
        "actor_role": current_user.get("role", "care_clinic"),
        "event_type": "clinic_update",
        "status": updates.get("status"),
        "notes": data.get("clinic_notes") or (f"assigned_vet_id={data.get('assigned_vet_id')}" if data.get("assigned_vet_id") else None),
        "created_at": datetime.utcnow(),
    })

    row = await db.care_requests.find_one({"id": request_id})
    if row:
        await create_notification(
            row.get("requested_by"),
            "Clinic updated your care request",
            f"Clinic updated your request to {row.get('status', 'updated')}.",
            "care_request",
            {"request_id": request_id, "status": row.get("status"), "route": "/clinic-care-management"}
        )
        if row.get("assigned_vet_id"):
            await create_notification(
                row.get("assigned_vet_id"),
                "Assigned to care request",
                "A clinic assigned you to a care request.",
                "care_request",
                {"request_id": request_id, "route": "/vet-care-requests"}
            )
    return {k: v for k, v in row.items() if k != "_id"} if row else {"success": True}

@api_router.get("/care-requests/{request_id}/timeline")
async def get_care_request_timeline(request_id: str, current_user: dict = Depends(get_current_user)):
    req = await db.care_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Care request not found")

    # basic access: requester, assigned vet/clinic, or admin
    uid = current_user["id"]
    if not current_user.get("is_admin", False) and current_user.get("role") != "admin":
        allowed = {
            req.get("requested_by"),
            req.get("assigned_vet_id"),
            req.get("assigned_clinic_id"),
        }
        if uid not in allowed:
            raise HTTPException(status_code=403, detail="Access denied")

    events = await db.care_request_events.find({"request_id": request_id}).sort("created_at", 1).to_list(300)
    return [{k: v for k, v in e.items() if k != "_id"} for e in events]

@api_router.get("/market-owner/overview")
async def get_market_owner_overview(current_user: dict = Depends(require_roles("market_owner"))):
    listings = await db.marketplace_listings.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(500)
    total = len(listings)
    active = len([l for l in listings if l.get("status") == "active"])
    sold = len([l for l in listings if l.get("status") == "sold"])
    revenue = sum(float(l.get("price", 0) or 0) for l in listings if l.get("status") == "sold")
    clean = [{k: v for k, v in l.items() if k != "_id"} for l in listings[:50]]
    return {
        "total_listings": total,
        "active_listings": active,
        "sold_listings": sold,
        "estimated_revenue": revenue,
        "recent_listings": clean,
    }

# ========================= PET TRACKING (PETSY TAG) =========================

class PetTagCreate(BaseModel):
    pet_id: str
    tag_code: str

class PetTag(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tag_code: str
    pet_id: str
    owner_id: str
    is_active: bool = True
    last_scanned: Optional[datetime] = None
    last_location: Optional[str] = None
    scan_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TagScan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tag_code: str
    pet_id: str
    scanner_name: Optional[str] = None
    scanner_phone: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

@api_router.post("/pet-tags")
async def register_pet_tag(tag: PetTagCreate, current_user: dict = Depends(get_current_user)):
    # Verify pet belongs to user
    pet = await db.pets.find_one({"id": tag.pet_id, "owner_id": current_user["id"]})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    normalized_code = (tag.tag_code or '').strip().upper()
    if not normalized_code:
        raise HTTPException(status_code=400, detail='Tag code is required')

    # If this pet already has a tag, replace it with the new code
    existing_pet_tag = await db.pet_tags.find_one({"pet_id": tag.pet_id, "owner_id": current_user["id"]})

    # Check if tag code already exists globally
    existing_code = await db.pet_tags.find_one({"tag_code": normalized_code})
    if existing_code and existing_code.get('owner_id') != current_user['id']:
        raise HTTPException(status_code=400, detail="Tag code already registered")

    # Reactivate existing code for same owner
    if existing_code and existing_code.get('owner_id') == current_user['id']:
        await db.pet_tags.update_one(
            {"id": existing_code["id"]},
            {"$set": {"pet_id": tag.pet_id, "is_active": True}}
        )
        updated = await db.pet_tags.find_one({"id": existing_code["id"]})
        return {**updated, "message": "Tag activated"}

    new_tag = PetTag(
        tag_code=normalized_code,
        pet_id=tag.pet_id,
        owner_id=current_user["id"],
        is_active=True,
    )

    # remove old tag row if pet already had one
    if existing_pet_tag:
        await db.pet_tags.delete_one({"id": existing_pet_tag["id"]})

    await db.pet_tags.insert_one(new_tag.dict())
    return {**new_tag.dict(), "message": "Tag registered and activated"}

@api_router.get("/pet-tags/{pet_id}")
async def get_pet_tag(pet_id: str, current_user: dict = Depends(get_current_user)):
    tag = await db.pet_tags.find_one({"pet_id": pet_id, "owner_id": current_user["id"]})
    if not tag:
        return None
    return {k: v for k, v in tag.items() if k != '_id'}

@api_router.put('/pet-tags/{pet_id}/status')
async def set_pet_tag_status(pet_id: str, data: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    tag = await db.pet_tags.find_one({"pet_id": pet_id, "owner_id": current_user["id"]})
    if not tag:
        raise HTTPException(status_code=404, detail='Tag not found')
    is_active = bool(data.get('is_active', True))
    await db.pet_tags.update_one({"id": tag["id"]}, {"$set": {"is_active": is_active}})
    updated = await db.pet_tags.find_one({"id": tag["id"]})
    return {k: v for k, v in updated.items() if k != '_id'}

@api_router.get("/pet-tags/scan/{tag_code}")
async def scan_pet_tag(tag_code: str):
    """Public endpoint - anyone can scan a tag"""
    tag_code = tag_code.upper()
    tag = await db.pet_tags.find_one({"tag_code": tag_code, "is_active": True})
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found or inactive")
    
    pet = await db.pets.find_one({"id": tag["pet_id"]})
    owner = await db.users.find_one({"id": tag["owner_id"]})
    
    # Increment scan count
    await db.pet_tags.update_one(
        {"tag_code": tag_code},
        {"$inc": {"scan_count": 1}, "$set": {"last_scanned": datetime.utcnow()}}
    )
    
    return {
        "pet": {
            "name": pet["name"] if pet else "Unknown",
            "species": pet.get("species") if pet else None,
            "breed": pet.get("breed") if pet else None,
            "image": pet.get("image") if pet else None,
            "description": pet.get("description") if pet else None,
        },
        "owner": {
            "name": owner["name"] if owner else "Unknown",
            "phone": owner.get("phone") if owner else None,
            "city": owner.get("city") if owner else None,
        },
        "tag": {k: v for k, v in tag.items() if k != '_id'}
    }

@api_router.post("/pet-tags/scan/{tag_code}/report")
async def report_tag_scan(tag_code: str, data: dict = Body(default={})):
    """Report a found pet via tag scan"""
    tag = await db.pet_tags.find_one({"tag_code": tag_code.upper()})
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    scan = TagScan(
        tag_code=tag_code.upper(),
        pet_id=tag["pet_id"],
        scanner_name=data.get('scanner_name'),
        scanner_phone=data.get('scanner_phone'),
        location=data.get('location'),
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        message=data.get('message')
    )
    await db.tag_scans.insert_one(scan.dict())
    
    # Update tag with last location
    await db.pet_tags.update_one(
        {"tag_code": tag_code.upper()},
        {"$set": {"last_location": data.get('location'), "last_scanned": datetime.utcnow()}}
    )
    
    return {"message": "Scan reported successfully", "scan_id": scan.id}

@api_router.get("/pet-tags/{pet_id}/scans")
async def get_tag_scans(pet_id: str, current_user: dict = Depends(get_current_user)):
    """Get scan history for a pet's tag"""
    tag = await db.pet_tags.find_one({"pet_id": pet_id, "owner_id": current_user["id"]})
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    scans = await db.tag_scans.find({"pet_id": pet_id}).sort("created_at", -1).to_list(50)
    return [{k: v for k, v in s.items() if k != '_id'} for s in scans]

# ========================= AI ASSISTANT =========================

@api_router.post("/ai/assistant")
async def ai_assistant(query: str, context: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """
    AI assistant endpoint with graceful fallback.
    - Preferred: emergentintegrations + EMERGENT_LLM_KEY
    - Fallback: local rule-based pet-care helper (never fails with 500 for missing AI deps)
    """

    def fallback_pet_reply(user_query: str) -> str:
        q = (user_query or "").lower()

        emergency_keywords = ["poison", "blood", "seizure", "can't breathe", "can’t breathe", "not breathing", "hit by car"]
        if any(k in q for k in emergency_keywords):
            return (
                "⚠️ This sounds urgent. Please contact the nearest emergency vet immediately. "
                "Keep your pet warm and calm, and avoid giving any medication unless a vet instructs you."
            )

        if "food" in q or "diet" in q or "eat" in q:
            return (
                "For food planning: choose species-specific food, split meals by age, keep clean water always available, "
                "and avoid sudden food changes. If you share pet type + age, I can give a precise plan."
            )

        if "name" in q:
            return "Name ideas: Luna, Milo, Bella, Max, Coco. Tell me pet gender/species and I’ll suggest a better custom list."

        if "breed" in q or "adopt" in q:
            return (
                "I can recommend a breed based on your home size, activity level, and experience. "
                "Share these 3 details and I’ll suggest the best matches."
            )

        return (
            "I can help with pet care, food, behavior, breed suggestions, and basic symptom guidance. "
            "For serious symptoms, always visit a licensed vet immediately."
        )

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            # graceful fallback if key is not configured
            return {"response": fallback_pet_reply(query), "query": query, "mode": "fallback"}

        system_message = """You are Petsy AI Assistant, a friendly and knowledgeable pet care expert.
You help users with:
- Pet breed recommendations based on their lifestyle
- Pet name suggestions
- Food and nutrition advice based on pet age and species
- Basic symptom detection and health advice (always recommend visiting a vet for serious issues)
- General pet care tips

Be concise, helpful, and always prioritize pet welfare. If symptoms sound serious, always recommend professional veterinary care.
Respond in the same language the user asks in (Arabic or English)."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"petsy-{current_user['id']}-{datetime.utcnow().strftime('%Y%m%d')}",
            system_message=system_message,
        ).with_model("openai", "gpt-4o")

        user_message = UserMessage(text=query)
        response = await chat.send_message(user_message)

        return {"response": response, "query": query, "mode": "llm"}

    except Exception as e:
        logger.warning(f"AI Assistant fallback activated: {e}")
        return {"response": fallback_pet_reply(query), "query": query, "mode": "fallback"}

# ========================= SEED DATA =========================

@api_router.post("/seed")
async def seed_data():
    """Seed initial data for testing"""
    
    # Seed Admin User
    admin_email = "admin@petsy.com"
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin User",
            "phone": "+963900000000",
            "password_hash": hash_password("admin123"),
            "is_verified": True,
            "is_admin": True,
            "role": "admin",
            "language": "en",
            "created_at": datetime.utcnow(),
        }
        await db.users.insert_one(admin_user)
        logger.info(f"Admin user created: {admin_email} / admin123")
    
    # Seed Vets
    vets_data = [
        {
            "name": "Dr. Ahmad Hassan",
            "specialty": "all",
            "experience_years": 15,
            "phone": "+963912345678",
            "clinic_name": "Damascus Pet Care",
            "address": "Mezzeh, Damascus",
            "city": "Damascus",
            "rating": 4.8,
            "reviews_count": 124,
            "services": ["checkup", "vaccination", "surgery", "dental"],
            "available_hours": "9:00 AM - 6:00 PM"
        },
        {
            "name": "Dr. Layla Nouri",
            "specialty": "cats",
            "experience_years": 10,
            "phone": "+963923456789",
            "clinic_name": "Feline Friends Clinic",
            "address": "Malki, Damascus",
            "city": "Damascus",
            "rating": 4.9,
            "reviews_count": 89,
            "services": ["checkup", "vaccination", "grooming"],
            "available_hours": "10:00 AM - 8:00 PM"
        },
        {
            "name": "Dr. Omar Khalil",
            "specialty": "dogs",
            "experience_years": 12,
            "phone": "+963934567890",
            "clinic_name": "Canine Care Center",
            "address": "Aleppo City Center",
            "city": "Aleppo",
            "rating": 4.7,
            "reviews_count": 156,
            "services": ["checkup", "vaccination", "surgery", "emergency"],
            "available_hours": "24/7 Emergency"
        }
    ]
    
    for vet in vets_data:
        existing = await db.vets.find_one({"name": vet["name"]})
        if not existing:
            await db.vets.insert_one(Vet(**vet).dict())
    
    # Seed Products
    products_data = [
        {"name": "Premium Dog Food", "category": "food", "price": 25.99, "pet_type": "dog", "brand": "Royal Canin", "in_stock": True, "quantity": 50, "rating": 4.5},
        {"name": "Cat Wet Food Pack", "category": "food", "price": 15.99, "pet_type": "cat", "brand": "Whiskas", "in_stock": True, "quantity": 100, "rating": 4.3},
        {"name": "Dog Chew Toy", "category": "toys", "price": 8.99, "pet_type": "dog", "in_stock": True, "quantity": 30, "rating": 4.7},
        {"name": "Cat Scratching Post", "category": "toys", "price": 29.99, "pet_type": "cat", "in_stock": True, "quantity": 20, "rating": 4.6},
        {"name": "Pet Shampoo", "category": "shampoo", "price": 12.99, "pet_type": "all", "brand": "Pet Head", "in_stock": True, "quantity": 45, "rating": 4.4},
        {"name": "Dog Collar - Medium", "category": "accessories", "price": 14.99, "pet_type": "dog", "in_stock": True, "quantity": 60, "rating": 4.2},
        {"name": "Cat Litter Box", "category": "accessories", "price": 35.99, "pet_type": "cat", "in_stock": True, "quantity": 25, "rating": 4.5},
        {"name": "Bird Cage - Large", "category": "cages", "price": 89.99, "pet_type": "bird", "in_stock": True, "quantity": 10, "rating": 4.8},
        {"name": "Flea Medicine", "category": "medicine", "price": 19.99, "pet_type": "all", "brand": "Frontline", "in_stock": True, "quantity": 80, "rating": 4.6},
        {"name": "Pet Vitamins", "category": "medicine", "price": 24.99, "pet_type": "all", "in_stock": True, "quantity": 40, "rating": 4.4}
    ]
    
    for product in products_data:
        existing = await db.products.find_one({"name": product["name"]})
        if not existing:
            await db.products.insert_one(Product(**product).dict())
    
    # Seed Emergency Contacts
    emergency_data = [
        {"name": "24/7 Pet Emergency Damascus", "type": "clinic", "phone": "+963911111111", "city": "Damascus", "is_24_hours": True, "address": "Mezzeh Highway"},
        {"name": "Animal Rescue Syria", "type": "rescue", "phone": "+963922222222", "city": "Damascus", "is_24_hours": False},
        {"name": "Aleppo Animal Shelter", "type": "shelter", "phone": "+963933333333", "city": "Aleppo", "is_24_hours": False},
        {"name": "Dr. Emergency Vet Line", "type": "vet", "phone": "+963944444444", "city": "Damascus", "is_24_hours": True}
    ]
    
    for contact in emergency_data:
        existing = await db.emergency_contacts.find_one({"name": contact["name"]})
        if not existing:
            await db.emergency_contacts.insert_one(EmergencyContact(**contact).dict())
    
    # Seed Sample Pets for Adoption
    sample_pets = [
        {"name": "Max", "species": "dog", "breed": "Golden Retriever", "age": "2 years", "gender": "male", "status": "for_adoption", "location": "Damascus", "vaccinated": True, "description": "Friendly and playful golden retriever looking for a loving home."},
        {"name": "Luna", "species": "cat", "breed": "Persian", "age": "1 year", "gender": "female", "status": "for_adoption", "location": "Damascus", "vaccinated": True, "description": "Beautiful Persian cat, very calm and affectionate."},
        {"name": "Rocky", "species": "dog", "breed": "German Shepherd", "age": "3 years", "gender": "male", "status": "for_sale", "price": 150, "location": "Aleppo", "vaccinated": True, "description": "Well-trained German Shepherd, great guard dog."},
        {"name": "Milo", "species": "cat", "breed": "Siamese", "age": "6 months", "gender": "male", "status": "for_adoption", "location": "Damascus", "vaccinated": False, "description": "Playful Siamese kitten, loves to play with toys."},
        {"name": "Bella", "species": "dog", "breed": "Husky", "age": "1.5 years", "gender": "female", "status": "for_sale", "price": 200, "location": "Homs", "vaccinated": True, "description": "Gorgeous Husky with blue eyes, needs an active family."}
    ]
    
    for pet in sample_pets:
        existing = await db.pets.find_one({"name": pet["name"], "breed": pet.get("breed")})
        if not existing:
            pet_obj = Pet(**pet, owner_id="system")
            await db.pets.insert_one(pet_obj.dict())
    
    # Seed Map Locations
    map_locations_data = [
        {"name": "Damascus Pet Care Center", "type": "vet", "address": "Mezzeh, Damascus", "city": "Damascus", "latitude": 33.5138, "longitude": 36.2765, "phone": "+963912345678", "rating": 4.8, "is_open_now": True, "hours": "9:00 AM - 9:00 PM"},
        {"name": "Feline Friends Clinic", "type": "clinic", "address": "Malki, Damascus", "city": "Damascus", "latitude": 33.5200, "longitude": 36.2900, "phone": "+963923456789", "rating": 4.9, "is_open_now": True, "hours": "10:00 AM - 8:00 PM"},
        {"name": "Happy Paws Pet Shop", "type": "pet_shop", "address": "Abu Rummaneh, Damascus", "city": "Damascus", "latitude": 33.5180, "longitude": 36.2850, "phone": "+963955555555", "rating": 4.5, "is_open_now": True, "hours": "10:00 AM - 10:00 PM"},
        {"name": "Syria Animal Shelter", "type": "shelter", "address": "Daraya Road, Damascus", "city": "Damascus", "latitude": 33.4800, "longitude": 36.2400, "phone": "+963922222222", "rating": 4.7, "is_open_now": False, "hours": "9:00 AM - 5:00 PM"},
        {"name": "Pet Paradise Store", "type": "pet_shop", "address": "Sha'lan, Damascus", "city": "Damascus", "latitude": 33.5120, "longitude": 36.2920, "phone": "+963966666666", "rating": 4.3, "is_open_now": True, "hours": "11:00 AM - 11:00 PM"},
        {"name": "Al-Jahez Park", "type": "park", "address": "Al-Jahez St, Damascus", "city": "Damascus", "latitude": 33.5050, "longitude": 36.3000, "rating": 4.6, "is_open_now": True, "hours": "6:00 AM - 10:00 PM"},
        {"name": "Aleppo Vet Hospital", "type": "vet", "address": "City Center, Aleppo", "city": "Aleppo", "latitude": 36.2021, "longitude": 37.1343, "phone": "+963934567890", "rating": 4.7, "is_open_now": True, "hours": "24/7"},
        {"name": "Homs Pet Clinic", "type": "clinic", "address": "Central Homs", "city": "Homs", "latitude": 34.7324, "longitude": 36.7137, "phone": "+963945678901", "rating": 4.4, "is_open_now": True, "hours": "8:00 AM - 6:00 PM"},
    ]
    
    for loc in map_locations_data:
        existing = await db.map_locations.find_one({"name": loc["name"]})
        if not existing:
            await db.map_locations.insert_one(MapLocation(**loc).dict())
    
    return {"message": "Seed data created successfully"}

# ========================= PAYMENT ENDPOINTS =========================

# Stripe placeholder key (replace with real key later)
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', 'sk_test_PLACEHOLDER_REPLACE_WITH_REAL_KEY')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', 'pk_test_PLACEHOLDER_REPLACE_WITH_REAL_KEY')

@api_router.get("/payments/config")
async def get_payment_config():
    """Get payment configuration for frontend"""
    return {
        "stripe_publishable_key": STRIPE_PUBLISHABLE_KEY,
        "supported_methods": ["stripe", "paypal", "shamcash", "cash_on_delivery"],
        "supported_cards": ["visa", "mastercard", "amex"],
        "currency": "USD",
        "points_per_dollar": 1,  # Earn 1 point per $1 spent
        "points_redemption_rate": 100,  # 100 points = $1 discount
    }

@api_router.post("/payments/process")
async def process_payment(payment: PaymentRequest, current_user: dict = Depends(get_current_user)):
    """Process a payment"""
    try:
        # Calculate final amount after points discount
        points_discount = payment.points_to_use / 100  # 100 points = $1
        final_amount = max(0, payment.amount - points_discount)
        
        # Simulate payment processing based on method
        payment_result = {
            "success": True,
            "payment_id": str(uuid.uuid4()),
            "amount": final_amount,
            "original_amount": payment.amount,
            "points_used": payment.points_to_use,
            "points_discount": points_discount,
            "method": payment.payment_method,
        }
        
        if payment.payment_method == "stripe":
            # In production, use real Stripe API:
            # stripe.api_key = STRIPE_SECRET_KEY
            # payment_intent = stripe.PaymentIntent.create(...)
            payment_result["stripe_client_secret"] = f"pi_{uuid.uuid4().hex[:24]}_secret_{uuid.uuid4().hex[:24]}"
            payment_result["message"] = "Stripe payment initiated"
            
        elif payment.payment_method == "paypal":
            payment_result["paypal_order_id"] = f"PAYPAL-{uuid.uuid4().hex[:16].upper()}"
            payment_result["message"] = "PayPal payment initiated"
            
        elif payment.payment_method == "shamcash":
            # Generate QR code data for ShamCash
            qr_data = {
                "merchant_id": "PETSY_MERCHANT_001",
                "amount": final_amount,
                "currency": "USD",
                "reference": str(uuid.uuid4()),
                "timestamp": datetime.utcnow().isoformat()
            }
            payment_result["shamcash_qr_data"] = str(qr_data)
            payment_result["shamcash_reference"] = qr_data["reference"]
            payment_result["message"] = "ShamCash QR generated"
            
        elif payment.payment_method == "cash_on_delivery":
            payment_result["message"] = "Cash on delivery confirmed"
        
        # If points were used, deduct them
        if payment.points_to_use > 0:
            await db.users.update_one(
                {"id": current_user["id"]},
                {"$inc": {"loyalty_points": -payment.points_to_use}}
            )
            # Record the points transaction
            await db.points_transactions.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": current_user["id"],
                "points": -payment.points_to_use,
                "transaction_type": "redeemed",
                "description": f"Redeemed {payment.points_to_use} points for ${points_discount:.2f} discount",
                "reference_id": payment_result["payment_id"],
                "created_at": datetime.utcnow()
            })
        
        # Award points for the purchase (1 point per $1 spent)
        points_earned = int(final_amount)
        if points_earned > 0:
            await db.users.update_one(
                {"id": current_user["id"]},
                {
                    "$inc": {
                        "loyalty_points": points_earned,
                        "lifetime_points": points_earned
                    }
                }
            )
            # Record earned points
            await db.points_transactions.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": current_user["id"],
                "points": points_earned,
                "transaction_type": "earned",
                "description": f"Earned {points_earned} points from purchase",
                "reference_id": payment_result["payment_id"],
                "created_at": datetime.utcnow()
            })
            payment_result["points_earned"] = points_earned
        
        # Store payment record
        await db.payments.insert_one({
            "id": payment_result["payment_id"],
            "user_id": current_user["id"],
            "amount": final_amount,
            "original_amount": payment.amount,
            "payment_method": payment.payment_method,
            "status": "succeeded" if payment.payment_method == "cash_on_delivery" else "pending",
            "order_id": payment.order_id,
            "appointment_id": payment.appointment_id,
            "sponsorship_id": payment.sponsorship_id,
            "points_used": payment.points_to_use,
            "points_earned": points_earned,
            "created_at": datetime.utcnow()
        })
        
        return payment_result
        
    except Exception as e:
        logger.error(f"Payment error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment processing failed: {str(e)}")

@api_router.post("/payments/confirm/{payment_id}")
async def confirm_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    """Confirm a pending payment (for Stripe/PayPal callbacks)"""
    payment = await db.payments.find_one({"id": payment_id, "user_id": current_user["id"]})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    await db.payments.update_one(
        {"id": payment_id},
        {"$set": {"status": "succeeded", "confirmed_at": datetime.utcnow()}}
    )
    
    return {"success": True, "message": "Payment confirmed"}

@api_router.get("/payments/history")
async def get_payment_history(current_user: dict = Depends(get_current_user)):
    """Get user's payment history"""
    payments = await db.payments.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(50)
    return [
        {
            "id": p.get("id"),
            "amount": p.get("amount"),
            "payment_method": p.get("payment_method"),
            "status": p.get("status"),
            "created_at": p.get("created_at"),
            "order_id": p.get("order_id"),
            "points_used": p.get("points_used", 0),
            "points_earned": p.get("points_earned", 0),
        }
        for p in payments
    ]

# ========================= LOYALTY POINTS ENDPOINTS =========================

@api_router.get("/loyalty/points")
async def get_loyalty_points(current_user: dict = Depends(get_current_user)):
    """Get user's loyalty points balance and tier"""
    user = await db.users.find_one({"id": current_user["id"]})
    total_points = user.get("loyalty_points", 0)
    lifetime_points = user.get("lifetime_points", 0)
    
    # Calculate tier based on lifetime points
    if lifetime_points >= 5000:
        tier = "platinum"
        tier_multiplier = 2.0
    elif lifetime_points >= 2000:
        tier = "gold"
        tier_multiplier = 1.5
    elif lifetime_points >= 500:
        tier = "silver"
        tier_multiplier = 1.25
    else:
        tier = "bronze"
        tier_multiplier = 1.0
    
    # Calculate points value in dollars
    points_value = total_points / 100
    
    return {
        "total_points": total_points,
        "lifetime_points": lifetime_points,
        "tier": tier,
        "tier_multiplier": tier_multiplier,
        "points_value": points_value,
        "points_to_next_tier": {
            "bronze": max(0, 500 - lifetime_points),
            "silver": max(0, 2000 - lifetime_points),
            "gold": max(0, 5000 - lifetime_points),
        }.get(tier, 0)
    }

@api_router.get("/loyalty/transactions")
async def get_points_transactions(current_user: dict = Depends(get_current_user)):
    """Get user's points transaction history"""
    transactions = await db.points_transactions.find(
        {"user_id": current_user["id"]}
    ).sort("created_at", -1).to_list(50)
    
    return [
        {
            "id": t.get("id"),
            "points": t.get("points"),
            "transaction_type": t.get("transaction_type"),
            "description": t.get("description"),
            "created_at": t.get("created_at"),
        }
        for t in transactions
    ]

@api_router.post("/loyalty/bonus")
async def award_bonus_points(
    points: int,
    description: str,
    current_user: dict = Depends(get_current_user)
):
    """Award bonus points to user (for promotions, etc.)"""
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$inc": {
                "loyalty_points": points,
                "lifetime_points": points
            }
        }
    )
    
    await db.points_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "points": points,
        "transaction_type": "bonus",
        "description": description,
        "created_at": datetime.utcnow()
    })
    
    return {"success": True, "points_awarded": points}

# ========================= ADMIN ENDPOINTS =========================

@api_router.get("/admin/stats")
async def get_admin_stats(admin_user: dict = Depends(get_admin_user)):
    """Get dashboard statistics"""
    try:
        users_count = await db.users.count_documents({})
        pets_count = await db.pets.count_documents({})
        orders_count = await db.orders.count_documents({})
        appointments_count = await db.appointments.count_documents({})
        products_count = await db.products.count_documents({})
        vets_count = await db.vets.count_documents({})
        
        # Calculate revenue
        orders = await db.orders.find({}).to_list(1000)
        revenue = sum(order.get("total", 0) for order in orders)
        
        pending_orders = await db.orders.count_documents({"status": "pending"})
        open_marketplace_reports = await db.marketplace_reports.count_documents({})
        pending_role_requests = await db.role_requests.count_documents({"status": "pending"})
        open_friend_reports = await db.friend_reports.count_documents({"status": "open"})
        
        # Recent activity
        recent_orders = await db.orders.find({}).sort("created_at", -1).limit(5).to_list(5)
        recent_users = await db.users.find({}).sort("created_at", -1).limit(5).to_list(5)
        
        # Monthly stats for charts
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        monthly_stats = []
        for i in range(6):
            month_start = (now - timedelta(days=30*i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_end = (month_start + timedelta(days=32)).replace(day=1)
            month_orders = await db.orders.count_documents({
                "created_at": {"$gte": month_start, "$lt": month_end}
            })
            month_revenue_data = await db.orders.find({
                "created_at": {"$gte": month_start, "$lt": month_end}
            }).to_list(1000)
            month_revenue = sum(o.get("total", 0) for o in month_revenue_data)
            monthly_stats.append({
                "month": month_start.strftime("%b"),
                "orders": month_orders,
                "revenue": month_revenue
            })
        
        return {
            "users": users_count,
            "pets": pets_count,
            "orders": orders_count,
            "appointments": appointments_count,
            "products": products_count,
            "vets": vets_count,
            "revenue": revenue,
            "pendingOrders": pending_orders,
            "openMarketplaceReports": open_marketplace_reports,
            "pendingRoleRequests": pending_role_requests,
            "openFriendReports": open_friend_reports,
            "monthlyStats": list(reversed(monthly_stats)),
            "recentOrders": [{"id": o.get("id"), "total": o.get("total", 0), "status": o.get("status")} for o in recent_orders],
            "recentUsers": [{"id": u.get("id"), "name": u.get("name"), "email": u.get("email")} for u in recent_users],
        }
    except Exception as e:
        logger.error(f"Admin stats error: {str(e)}")
        return {
            "users": 0, "pets": 0, "orders": 0, "appointments": 0,
            "products": 0, "vets": 0, "revenue": 0, "pendingOrders": 0,
            "openMarketplaceReports": 0, "pendingRoleRequests": 0, "openFriendReports": 0,
            "monthlyStats": [], "recentOrders": [], "recentUsers": [],
        }

@api_router.get("/admin/users")
async def get_all_users(admin_user: dict = Depends(get_admin_user)):
    """Get all users for admin"""
    users = await db.users.find({}).to_list(1000)
    user_ids = [u.get("id") for u in users if u.get("id")]

    # friend report counts per target user
    pipeline = [
        {"$group": {"_id": "$target_user_id", "count": {"$sum": 1}, "open_count": {"$sum": {"$cond": [{"$eq": ["$status", "open"]}, 1, 0]}}}},
    ]
    report_rows = await db.friend_reports.aggregate(pipeline).to_list(2000)
    report_map = {r.get("_id"): r for r in report_rows}

    blocked_rows = await db.blocked_users.find({"user_id": admin_user["id"], "blocked_user_id": {"$in": user_ids}}).to_list(2000)
    blocked_set = {r.get("blocked_user_id") for r in blocked_rows}

    return [
        {
            "id": u.get("id"),
            "name": u.get("name"),
            "email": u.get("email"),
            "phone": u.get("phone"),
            "city": u.get("city"),
            "is_verified": u.get("is_verified", False),
            "is_admin": u.get("is_admin", False),
            "role": u.get("role", "user"),
            "created_at": u.get("created_at"),
            "loyalty_points": u.get("loyalty_points", 0),
            "friend_reports_count": (report_map.get(u.get("id")) or {}).get("count", 0),
            "friend_reports_open_count": (report_map.get(u.get("id")) or {}).get("open_count", 0),
            "is_blocked_by_admin": u.get("id") in blocked_set,
        }
        for u in users
    ]

@api_router.put("/admin/users/{user_id}")
async def update_user_admin(user_id: str, data: dict, admin_user: dict = Depends(get_admin_user)):
    """Update user (admin)"""
    if "role" in data:
      role = str(data.get("role") or "").strip()
      if role not in ALLOWED_ROLES:
          raise HTTPException(status_code=400, detail=f"Invalid role. Allowed: {', '.join(sorted(ALLOWED_ROLES))}")
      data["is_admin"] = role == "admin"
    await db.users.update_one({"id": user_id}, {"$set": data})
    await audit_admin_action(admin_user, "update_user", "user", user_id, data)
    return {"success": True}

@api_router.delete("/admin/users/{user_id}")
async def delete_user_admin(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Delete user (admin)"""
    await db.users.delete_one({"id": user_id})
    await audit_admin_action(admin_user, "delete_user", "user", user_id)
    return {"success": True}

@api_router.post("/admin/users/{user_id}/make-admin")
async def make_user_admin(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Promote user to admin"""
    await db.users.update_one({"id": user_id}, {"$set": {"is_admin": True, "role": "admin"}})
    await audit_admin_action(admin_user, "make_admin", "user", user_id)
    return {"success": True}

@api_router.post("/admin/users/{user_id}/remove-admin")
async def remove_user_admin(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Remove admin privileges from user"""
    await db.users.update_one({"id": user_id}, {"$set": {"is_admin": False, "role": "user"}})
    await audit_admin_action(admin_user, "remove_admin", "user", user_id)
    return {"success": True}

@api_router.post('/admin/users/{user_id}/block')
async def block_user_admin(user_id: str, admin_user: dict = Depends(get_admin_user)):
    if user_id == admin_user.get('id'):
        raise HTTPException(status_code=400, detail='Cannot block yourself')
    existing = await db.blocked_users.find_one({"user_id": admin_user["id"], "blocked_user_id": user_id})
    if not existing:
        await db.blocked_users.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": admin_user["id"],
            "blocked_user_id": user_id,
            "created_at": datetime.utcnow(),
        })
    await audit_admin_action(admin_user, "block_user", "user", user_id)
    return {"success": True}

@api_router.delete('/admin/users/{user_id}/block')
async def unblock_user_admin(user_id: str, admin_user: dict = Depends(get_admin_user)):
    await db.blocked_users.delete_one({"user_id": admin_user["id"], "blocked_user_id": user_id})
    await audit_admin_action(admin_user, "unblock_user", "user", user_id)
    return {"success": True}

@api_router.get("/admin/marketplace/listings")
async def get_marketplace_listings_admin(admin_user: dict = Depends(get_admin_user)):
    rows = await db.marketplace_listings.find({}).sort("created_at", -1).to_list(1000)
    return [{k: v for k, v in r.items() if k != "_id"} for r in rows]

@api_router.get("/admin/marketplace/reports")
async def get_marketplace_reports_admin(admin_user: dict = Depends(get_admin_user)):
    rows = await db.marketplace_reports.find({}).sort("created_at", -1).to_list(1000)
    return [{k: v for k, v in r.items() if k != "_id"} for r in rows]

@api_router.put("/admin/marketplace/listings/{listing_id}/status")
async def set_marketplace_listing_status_admin(listing_id: str, data: dict, admin_user: dict = Depends(get_admin_user)):
    status = data.get("status", "active")
    if status not in ["active", "sold", "archived"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    listing = await db.marketplace_listings.find_one({"id": listing_id})
    await db.marketplace_listings.update_one({"id": listing_id}, {"$set": {"status": status, "updated_at": datetime.utcnow()}})
    if listing and listing.get("user_id"):
        await create_notification(
            listing.get("user_id"),
            "Marketplace listing update",
            f"Your listing status is now {status}.",
            "marketplace",
            {"listing_id": listing_id, "status": status, "route": "/my-marketplace-listings"}
        )
    await audit_admin_action(admin_user, "set_marketplace_listing_status", "marketplace_listing", listing_id, {"status": status})
    return {"success": True}

@api_router.post("/role-requests")
async def create_role_request(data: dict, current_user: dict = Depends(get_current_user)):
    target_role = str(data.get("target_role") or "").strip()
    if target_role not in {"vet", "market_owner", "care_clinic"}:
        raise HTTPException(status_code=400, detail="Invalid target role")

    existing = await db.role_requests.find_one({
        "user_id": current_user["id"],
        "target_role": target_role,
        "status": "pending"
    })
    if existing:
        return {"message": "Request already pending", "id": existing.get("id")}

    row = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": current_user.get("name"),
        "user_email": current_user.get("email"),
        "target_role": target_role,
        "reason": data.get("reason"),
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    await db.role_requests.insert_one(row)
    await create_notifications_for_admins(
        "New role request",
        f"{current_user.get('name', 'User')} requested role: {target_role}",
        "role_request",
        {"request_id": row["id"], "target_role": target_role, "route": "/admin/role-requests"}
    )
    return {k: v for k, v in row.items() if k != "_id"}

@api_router.get("/role-requests/my")
async def get_my_role_requests(current_user: dict = Depends(get_current_user)):
    rows = await db.role_requests.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(200)
    return [{k: v for k, v in r.items() if k != "_id"} for r in rows]

@api_router.get("/admin/role-requests")
async def get_role_requests_admin(admin_user: dict = Depends(get_admin_user)):
    rows = await db.role_requests.find({}).sort("created_at", -1).to_list(1000)
    return [{k: v for k, v in r.items() if k != "_id"} for r in rows]

@api_router.put("/admin/role-requests/{request_id}")
async def handle_role_request_admin(request_id: str, data: dict, admin_user: dict = Depends(get_admin_user)):
    req = await db.role_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Role request not found")

    action = data.get("action")  # approve|reject
    if action not in {"approve", "reject"}:
        raise HTTPException(status_code=400, detail="Invalid action")

    if action == "approve":
        role = req.get("target_role", "user")
        if role not in ALLOWED_ROLES:
            raise HTTPException(status_code=400, detail="Invalid role in request")
        await db.users.update_one({"id": req.get("user_id")}, {"$set": {"role": role, "is_admin": role == "admin"}})

    new_status = "approved" if action == "approve" else "rejected"
    await db.role_requests.update_one(
        {"id": request_id},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow(), "reviewed_by": admin_user["id"]}}
    )

    await create_notification(
        req.get("user_id"),
        "Role request update",
        f"Your request for {req.get('target_role')} was {new_status}.",
        "role_request",
        {"request_id": request_id, "status": new_status, "target_role": req.get("target_role"), "route": "/my-role-requests"}
    )
    await audit_admin_action(admin_user, "review_role_request", "role_request", request_id, {"action": action, "status": new_status})
    return {"success": True}

@api_router.get('/admin/audit-logs')
async def get_admin_audit_logs(
    limit: int = 200,
    q: Optional[str] = None,
    action: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    admin_user: dict = Depends(get_admin_user)
):
    query: dict = {}

    if action and action != 'all':
        query['action'] = action

    if q:
        qv = str(q).strip()
        if qv:
            query['$or'] = [
                {"action": {"$regex": qv, "$options": "i"}},
                {"target_type": {"$regex": qv, "$options": "i"}},
                {"target_id": {"$regex": qv, "$options": "i"}},
                {"admin_email": {"$regex": qv, "$options": "i"}},
            ]

    date_query: dict = {}
    if from_date:
        try:
            date_query['$gte'] = datetime.fromisoformat(str(from_date))
        except Exception:
            pass
    if to_date:
        try:
            # inclusive day if YYYY-MM-DD provided
            to_dt = datetime.fromisoformat(str(to_date))
            if len(str(to_date)) == 10:
                to_dt = to_dt + timedelta(days=1)
            date_query['$lt'] = to_dt
        except Exception:
            pass
    if date_query:
        query['created_at'] = date_query

    rows = await db.admin_audit_logs.find(query).sort("created_at", -1).limit(max(1, min(limit, 1000))).to_list(1000)
    return [{k: v for k, v in r.items() if k != "_id"} for r in rows]

@api_router.get("/admin/orders")
async def get_all_orders_admin(admin_user: dict = Depends(get_admin_user)):
    """Get all orders for admin"""
    orders = await db.orders.find({}).sort("created_at", -1).to_list(1000)
    result = []
    for order in orders:
        user = await db.users.find_one({"id": order.get("user_id")})
        result.append({
            "id": order.get("id"),
            "user_id": order.get("user_id"),
            "user_name": user.get("name") if user else "Unknown",
            "items": order.get("items", []),
            "total": order.get("total", 0),
            "status": order.get("status", "pending"),
            "payment_method": order.get("payment_method"),
            "shipping_address": order.get("shipping_address"),
            "shipping_city": order.get("shipping_city"),
            "created_at": order.get("created_at"),
        })
    return result

@api_router.put("/admin/orders/{order_id}")
async def update_order_admin(order_id: str, data: dict, admin_user: dict = Depends(get_admin_user)):
    """Update order status (admin)"""
    await db.orders.update_one({"id": order_id}, {"$set": data})
    return {"success": True}

@api_router.get("/admin/products")
async def get_all_products_admin(admin_user: dict = Depends(get_admin_user)):
    """Get all products for admin"""
    products = await db.products.find({}).to_list(1000)
    return [
        {
            "id": p.get("id"),
            "name": p.get("name"),
            "description": p.get("description"),
            "price": p.get("price"),
            "category": p.get("category"),
            "stock": p.get("stock", 0),
            "image_url": p.get("image_url"),
            "is_active": p.get("is_active", True),
        }
        for p in products
    ]

@api_router.post("/admin/products")
async def create_product_admin(data: dict, admin_user: dict = Depends(get_admin_user)):
    """Create new product (admin)"""
    product = {
        "id": str(uuid.uuid4()),
        **data,
        "created_at": datetime.utcnow(),
    }
    await db.products.insert_one(product)
    return product

@api_router.put("/admin/products/{product_id}")
async def update_product_admin(product_id: str, data: dict, admin_user: dict = Depends(get_admin_user)):
    """Update product (admin)"""
    await db.products.update_one({"id": product_id}, {"$set": data})
    return {"success": True}

@api_router.delete("/admin/products/{product_id}")
async def delete_product_admin(product_id: str, admin_user: dict = Depends(get_admin_user)):
    """Delete product (admin)"""
    await db.products.delete_one({"id": product_id})
    return {"success": True}

@api_router.get("/admin/appointments")
async def get_all_appointments_admin(admin_user: dict = Depends(get_admin_user)):
    """Get all appointments for admin"""
    appointments = await db.appointments.find({}).sort("date", -1).to_list(1000)
    return appointments

@api_router.get("/admin/vets")
async def get_all_vets_admin(admin_user: dict = Depends(get_admin_user)):
    """Get all vets for admin"""
    vets = await db.vets.find({}).to_list(100)
    return vets

@api_router.post("/admin/vets")
async def create_vet_admin(data: dict, admin_user: dict = Depends(get_admin_user)):
    """Create new vet (admin)"""
    vet = {
        "id": str(uuid.uuid4()),
        **data,
        "created_at": datetime.utcnow(),
    }
    await db.vets.insert_one(vet)
    return vet

@api_router.put("/admin/vets/{vet_id}")
async def update_vet_admin(vet_id: str, data: dict, admin_user: dict = Depends(get_admin_user)):
    """Update vet (admin)"""
    await db.vets.update_one({"id": vet_id}, {"$set": data})
    return {"success": True}

@api_router.delete("/admin/vets/{vet_id}")
async def delete_vet_admin(vet_id: str, admin_user: dict = Depends(get_admin_user)):
    """Delete vet (admin)"""
    await db.vets.delete_one({"id": vet_id})
    return {"success": True}

@api_router.get("/admin/community")
async def get_all_posts_admin(admin_user: dict = Depends(get_admin_user)):
    """Get all community posts for admin"""
    posts = await db.community_posts.find({}).sort("created_at", -1).to_list(1000)
    return posts

@api_router.delete("/admin/community/{post_id}")
async def delete_post_admin(post_id: str, admin_user: dict = Depends(get_admin_user)):
    """Delete community post (admin)"""
    await db.community_posts.delete_one({"id": post_id})
    return {"success": True}

@api_router.get("/admin/payments")
async def get_all_payments_admin(admin_user: dict = Depends(get_admin_user)):
    """Get all payments for admin"""
    payments = await db.payments.find({}).sort("created_at", -1).to_list(1000)
    return payments

@api_router.get("/admin/sponsorships")
async def get_all_sponsorships_admin(admin_user: dict = Depends(get_admin_user)):
    """Get all sponsorships for admin"""
    sponsorships = await db.sponsorships.find({}).sort("created_at", -1).to_list(1000)
    return sponsorships

@api_router.get("/admin/locations")
async def get_all_locations_admin(admin_user: dict = Depends(get_admin_user)):
    """Get all map locations for admin"""
    locations = await db.map_locations.find({}).to_list(1000)
    return locations

@api_router.post("/admin/locations")
async def create_location_admin(data: dict, admin_user: dict = Depends(get_admin_user)):
    """Create map location (admin)"""
    location = {
        "id": str(uuid.uuid4()),
        **data,
    }
    await db.map_locations.insert_one(location)
    return location

@api_router.put("/admin/locations/{location_id}")
async def update_location_admin(location_id: str, data: dict, admin_user: dict = Depends(get_admin_user)):
    """Update map location (admin)"""
    await db.map_locations.update_one({"id": location_id}, {"$set": data})
    return {"success": True}

@api_router.delete("/admin/locations/{location_id}")
async def delete_location_admin(location_id: str, admin_user: dict = Depends(get_admin_user)):
    """Delete map location (admin)"""
    await db.map_locations.delete_one({"id": location_id})
    return {"success": True}

# ========================= MAIN ROUTES =========================

@api_router.get("/")
async def root():
    return {"message": "Welcome to Petsy API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
