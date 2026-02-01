from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
import random
import base64

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

# Create the main app
app = FastAPI(title="Petsy API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_verified: bool = False
    is_admin: bool = False
    role: str = "user"  # user, admin
    verification_code: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
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

# ========================= AUTH ROUTES =========================

@api_router.post("/auth/signup", response_model=dict)
async def signup(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    verification_code = generate_verification_code()
    user = User(
        email=user_data.email,
        name=user_data.name,
        phone=user_data.phone,
        verification_code=verification_code
    )
    user_dict = user.dict()
    user_dict["password_hash"] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    logger.info(f"User registered: {user.email}, verification code: {verification_code}")
    
    return {"message": "User created. Please verify your account.", "user_id": user.id, "verification_code": verification_code}

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

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["id"]})
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user)
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

@api_router.put("/auth/update", response_model=UserResponse)
async def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if update_dict:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_dict})
    updated = await db.users.find_one({"id": current_user["id"]})
    return UserResponse(**updated)

# ========================= PET ROUTES =========================

@api_router.post("/pets", response_model=Pet)
async def create_pet(pet_data: PetCreate, current_user: dict = Depends(get_current_user)):
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

@api_router.get("/favorites", response_model=List[Pet])
async def get_favorites(current_user: dict = Depends(get_current_user)):
    favorites = await db.favorites.find({"user_id": current_user["id"]}).to_list(100)
    pet_ids = [f["pet_id"] for f in favorites]
    pets = await db.pets.find({"id": {"$in": pet_ids}}).to_list(100)
    return [Pet(**pet) for pet in pets]

# ========================= HEALTH RECORDS =========================

@api_router.post("/health-records", response_model=HealthRecord)
async def create_health_record(record: HealthRecordCreate, current_user: dict = Depends(get_current_user)):
    # Verify pet belongs to user
    pet = await db.pets.find_one({"id": record.pet_id, "owner_id": current_user["id"]})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    health_record = HealthRecord(**record.dict())
    await db.health_records.insert_one(health_record.dict())
    return health_record

@api_router.get("/health-records/{pet_id}", response_model=List[HealthRecord])
async def get_health_records(pet_id: str, current_user: dict = Depends(get_current_user)):
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
    appointments = await db.appointments.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(100)
    return [Appointment(**a) for a in appointments]

@api_router.get("/appointments/{appointment_id}")
async def get_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    appointment = await db.appointments.find_one({"id": appointment_id, "user_id": current_user["id"]})
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
    order = Order(**order_data.dict(), user_id=current_user["id"])
    await db.orders.insert_one(order.dict())
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(100)
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
    # Check if conversation already exists
    existing = await db.conversations.find_one({
        "participants": {"$all": [current_user["id"], data.other_user_id]}
    })
    
    if existing:
        # Add message to existing conversation
        chat_msg = ChatMessage(
            conversation_id=existing["id"],
            sender_id=current_user["id"],
            content=data.initial_message
        )
        await db.chat_messages.insert_one(chat_msg.dict())
        await db.conversations.update_one(
            {"id": existing["id"]},
            {"$set": {"last_message": data.initial_message, "last_message_time": datetime.utcnow()}}
        )
        return {"conversation_id": existing["id"], "is_new": False}
    
    # Create new conversation
    conversation = Conversation(
        participants=[current_user["id"], data.other_user_id],
        pet_id=data.pet_id,
        last_message=data.initial_message,
        last_message_time=datetime.utcnow()
    )
    await db.conversations.insert_one(conversation.dict())
    
    # Add initial message
    chat_msg = ChatMessage(
        conversation_id=conversation.id,
        sender_id=current_user["id"],
        content=data.initial_message
    )
    await db.chat_messages.insert_one(chat_msg.dict())
    
    return {"conversation_id": conversation.id, "is_new": True}

@api_router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    conversations = await db.conversations.find({
        "participants": current_user["id"]
    }).sort("last_message_time", -1).to_list(100)
    
    # Enrich with user info
    result = []
    for conv in conversations:
        other_user_id = [p for p in conv["participants"] if p != current_user["id"]][0]
        other_user = await db.users.find_one({"id": other_user_id})
        
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
                "avatar": other_user.get("avatar") if other_user else None
            },
            "unread_count": unread
        }
        result.append(clean_conv)
    
    return result

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
    await db.chat_messages.update_many(
        {"conversation_id": conversation_id, "sender_id": {"$ne": current_user["id"]}},
        {"$set": {"is_read": True}}
    )
    
    messages = await db.chat_messages.find({"conversation_id": conversation_id}).sort("created_at", 1).to_list(200)
    return [ChatMessage(**m) for m in messages]

@api_router.post("/conversations/{conversation_id}/messages")
async def send_chat_message(conversation_id: str, content: str, current_user: dict = Depends(get_current_user)):
    # Verify user is participant
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participants": current_user["id"]
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    chat_msg = ChatMessage(
        conversation_id=conversation_id,
        sender_id=current_user["id"],
        content=content
    )
    await db.chat_messages.insert_one(chat_msg.dict())
    
    # Update conversation
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"last_message": content, "last_message_time": datetime.utcnow()}}
    )
    
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
async def get_community_posts(type: Optional[str] = None, limit: int = 50):
    query = {}
    if type:
        query["type"] = type
    posts = await db.community.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return [CommunityPost(**p) for p in posts]

@api_router.post("/community/{post_id}/like")
async def like_community_post(post_id: str, current_user: dict = Depends(get_current_user)):
    await db.community.update_one({"id": post_id}, {"$inc": {"likes": 1}})
    return {"message": "Liked"}

# ========================= COMMUNITY COMMENTS =========================

class CommentCreate(BaseModel):
    content: str

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

@api_router.post("/community/{post_id}/comments")
async def create_comment(post_id: str, comment: CommentCreate, current_user: dict = Depends(get_current_user)):
    new_comment = Comment(
        post_id=post_id,
        user_id=current_user["id"],
        user_name=current_user["name"],
        user_avatar=current_user.get("avatar"),
        content=comment.content
    )
    await db.comments.insert_one(new_comment.dict())
    await db.community.update_one({"id": post_id}, {"$inc": {"comments": 1}})
    return new_comment

@api_router.get("/community/{post_id}/comments")
async def get_comments(post_id: str):
    comments = await db.comments.find({"post_id": post_id}).sort("created_at", -1).to_list(100)
    return comments

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
    query = {"user_id": current_user["id"]}
    if item_type:
        query["item_type"] = item_type
    favorites = await db.favorites.find(query).sort("created_at", -1).to_list(100)
    
    # Populate with actual items
    result = []
    for fav in favorites:
        if fav["item_type"] == "pet":
            item = await db.pets.find_one({"id": fav["item_id"]})
        else:
            item = await db.products.find_one({"id": fav["item_id"]})
        if item:
            result.append({**fav, "item": item})
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
async def get_pet_sponsorships(pet_id: str):
    sponsorships = await db.sponsorships.find({"pet_id": pet_id, "status": "completed"}).sort("created_at", -1).to_list(50)
    return sponsorships

@api_router.get("/sponsorships/my")
async def get_my_sponsorships(current_user: dict = Depends(get_current_user)):
    sponsorships = await db.sponsorships.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(100)
    return [Sponsorship(**s) for s in sponsorships]

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
    
    # Check if tag code already exists
    existing = await db.pet_tags.find_one({"tag_code": tag.tag_code})
    if existing:
        raise HTTPException(status_code=400, detail="Tag code already registered")
    
    new_tag = PetTag(
        tag_code=tag.tag_code,
        pet_id=tag.pet_id,
        owner_id=current_user["id"]
    )
    await db.pet_tags.insert_one(new_tag.dict())
    return new_tag

@api_router.get("/pet-tags/{pet_id}")
async def get_pet_tag(pet_id: str, current_user: dict = Depends(get_current_user)):
    tag = await db.pet_tags.find_one({"pet_id": pet_id, "owner_id": current_user["id"]})
    if not tag:
        return None
    return tag

@api_router.get("/pet-tags/scan/{tag_code}")
async def scan_pet_tag(tag_code: str):
    """Public endpoint - anyone can scan a tag"""
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
            "species": pet.get("species"),
            "breed": pet.get("breed"),
            "image": pet.get("image"),
            "description": pet.get("description"),
        },
        "owner": {
            "name": owner["name"] if owner else "Unknown",
            "phone": owner.get("phone"),
            "city": owner.get("city"),
        },
        "tag": tag
    }

@api_router.post("/pet-tags/scan/{tag_code}/report")
async def report_tag_scan(tag_code: str, location: Optional[str] = None, 
                          scanner_name: Optional[str] = None, scanner_phone: Optional[str] = None,
                          message: Optional[str] = None, latitude: Optional[float] = None,
                          longitude: Optional[float] = None):
    """Report a found pet via tag scan"""
    tag = await db.pet_tags.find_one({"tag_code": tag_code})
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    scan = TagScan(
        tag_code=tag_code,
        pet_id=tag["pet_id"],
        scanner_name=scanner_name,
        scanner_phone=scanner_phone,
        location=location,
        latitude=latitude,
        longitude=longitude,
        message=message
    )
    await db.tag_scans.insert_one(scan.dict())
    
    # Update tag with last location
    await db.pet_tags.update_one(
        {"tag_code": tag_code},
        {"$set": {"last_location": location, "last_scanned": datetime.utcnow()}}
    )
    
    return {"message": "Scan reported successfully", "scan_id": scan.id}

@api_router.get("/pet-tags/{pet_id}/scans")
async def get_tag_scans(pet_id: str, current_user: dict = Depends(get_current_user)):
    """Get scan history for a pet's tag"""
    tag = await db.pet_tags.find_one({"pet_id": pet_id, "owner_id": current_user["id"]})
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    scans = await db.tag_scans.find({"pet_id": pet_id}).sort("created_at", -1).to_list(50)
    return scans

# ========================= AI ASSISTANT =========================

@api_router.post("/ai/assistant")
async def ai_assistant(query: str, context: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
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
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=query)
        response = await chat.send_message(user_message)
        
        return {"response": response, "query": query}
    except Exception as e:
        logger.error(f"AI Assistant error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================= SEED DATA =========================

@api_router.post("/seed")
async def seed_data():
    """Seed initial data for testing"""
    
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
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
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
        
        return {
            "users": users_count,
            "pets": pets_count,
            "orders": orders_count,
            "appointments": appointments_count,
            "products": products_count,
            "vets": vets_count,
            "revenue": revenue,
            "pendingOrders": pending_orders,
        }
    except Exception as e:
        logger.error(f"Admin stats error: {str(e)}")
        return {
            "users": 0, "pets": 0, "orders": 0, "appointments": 0,
            "products": 0, "vets": 0, "revenue": 0, "pendingOrders": 0,
        }

@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Get all users for admin"""
    users = await db.users.find({}).to_list(1000)
    return [
        {
            "id": u.get("id"),
            "name": u.get("name"),
            "email": u.get("email"),
            "phone": u.get("phone"),
            "city": u.get("city"),
            "is_verified": u.get("is_verified", False),
            "role": u.get("role", "user"),
            "created_at": u.get("created_at"),
            "loyalty_points": u.get("loyalty_points", 0),
        }
        for u in users
    ]

@api_router.put("/admin/users/{user_id}")
async def update_user_admin(user_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update user (admin)"""
    await db.users.update_one({"id": user_id}, {"$set": data})
    return {"success": True}

@api_router.delete("/admin/users/{user_id}")
async def delete_user_admin(user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete user (admin)"""
    await db.users.delete_one({"id": user_id})
    return {"success": True}

@api_router.get("/admin/orders")
async def get_all_orders_admin(current_user: dict = Depends(get_current_user)):
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
async def update_order_admin(order_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update order status (admin)"""
    await db.orders.update_one({"id": order_id}, {"$set": data})
    return {"success": True}

@api_router.get("/admin/products")
async def get_all_products_admin(current_user: dict = Depends(get_current_user)):
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
async def create_product_admin(data: dict, current_user: dict = Depends(get_current_user)):
    """Create new product (admin)"""
    product = {
        "id": str(uuid.uuid4()),
        **data,
        "created_at": datetime.utcnow(),
    }
    await db.products.insert_one(product)
    return product

@api_router.put("/admin/products/{product_id}")
async def update_product_admin(product_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update product (admin)"""
    await db.products.update_one({"id": product_id}, {"$set": data})
    return {"success": True}

@api_router.delete("/admin/products/{product_id}")
async def delete_product_admin(product_id: str, current_user: dict = Depends(get_current_user)):
    """Delete product (admin)"""
    await db.products.delete_one({"id": product_id})
    return {"success": True}

@api_router.get("/admin/appointments")
async def get_all_appointments_admin(current_user: dict = Depends(get_current_user)):
    """Get all appointments for admin"""
    appointments = await db.appointments.find({}).sort("date", -1).to_list(1000)
    return appointments

@api_router.get("/admin/vets")
async def get_all_vets_admin(current_user: dict = Depends(get_current_user)):
    """Get all vets for admin"""
    vets = await db.vets.find({}).to_list(100)
    return vets

@api_router.post("/admin/vets")
async def create_vet_admin(data: dict, current_user: dict = Depends(get_current_user)):
    """Create new vet (admin)"""
    vet = {
        "id": str(uuid.uuid4()),
        **data,
        "created_at": datetime.utcnow(),
    }
    await db.vets.insert_one(vet)
    return vet

@api_router.put("/admin/vets/{vet_id}")
async def update_vet_admin(vet_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update vet (admin)"""
    await db.vets.update_one({"id": vet_id}, {"$set": data})
    return {"success": True}

@api_router.delete("/admin/vets/{vet_id}")
async def delete_vet_admin(vet_id: str, current_user: dict = Depends(get_current_user)):
    """Delete vet (admin)"""
    await db.vets.delete_one({"id": vet_id})
    return {"success": True}

@api_router.get("/admin/community")
async def get_all_posts_admin(current_user: dict = Depends(get_current_user)):
    """Get all community posts for admin"""
    posts = await db.community_posts.find({}).sort("created_at", -1).to_list(1000)
    return posts

@api_router.delete("/admin/community/{post_id}")
async def delete_post_admin(post_id: str, current_user: dict = Depends(get_current_user)):
    """Delete community post (admin)"""
    await db.community_posts.delete_one({"id": post_id})
    return {"success": True}

@api_router.get("/admin/payments")
async def get_all_payments_admin(current_user: dict = Depends(get_current_user)):
    """Get all payments for admin"""
    payments = await db.payments.find({}).sort("created_at", -1).to_list(1000)
    return payments

@api_router.get("/admin/sponsorships")
async def get_all_sponsorships_admin(current_user: dict = Depends(get_current_user)):
    """Get all sponsorships for admin"""
    sponsorships = await db.sponsorships.find({}).sort("created_at", -1).to_list(1000)
    return sponsorships

@api_router.get("/admin/locations")
async def get_all_locations_admin(current_user: dict = Depends(get_current_user)):
    """Get all map locations for admin"""
    locations = await db.map_locations.find({}).to_list(1000)
    return locations

@api_router.post("/admin/locations")
async def create_location_admin(data: dict, current_user: dict = Depends(get_current_user)):
    """Create map location (admin)"""
    location = {
        "id": str(uuid.uuid4()),
        **data,
    }
    await db.map_locations.insert_one(location)
    return location

@api_router.put("/admin/locations/{location_id}")
async def update_location_admin(location_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update map location (admin)"""
    await db.map_locations.update_one({"id": location_id}, {"$set": data})
    return {"success": True}

@api_router.delete("/admin/locations/{location_id}")
async def delete_location_admin(location_id: str, current_user: dict = Depends(get_current_user)):
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
