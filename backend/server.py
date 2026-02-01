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
    appointments = await db.appointments.find({"user_id": current_user["id"]}).to_list(100)
    return [Appointment(**a) for a in appointments]

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
    
    return {"message": "Seed data created successfully"}

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
