from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import time
from datetime import datetime, timedelta
import os
import uuid
import shutil
import json
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from database import engine, get_db
import models

# Create tables
models.Base.metadata.create_all(bind=engine)

# Load environment variables
load_dotenv()

app = FastAPI(title="Sales Monitoring API")

# Ensure uploads directory exists and serve static files
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Allow CORS for Expo and Admin Web app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DB Seeding ---
@app.on_event("startup")
def seed_data():
    db = next(get_db())
    # Seed Admin User
    admin = db.query(models.User).filter(models.User.nik == "admin").first()
    if not admin:
        db.add(models.User(nik="admin", password="admin", name="Admin User", role="admin"))
    
    # Seed Default Salesman
    usman = db.query(models.User).filter(models.User.nik == "12345").first()
    if not usman:
        db.add(models.User(nik="12345", password="password", name="Usman", role="salesman"))

    # Seed Initial Products
    if db.query(models.Product).count() == 0:
        products = [
            models.Product(id="p1", name="Susu UHT 250ml", quantity=100, price=5000, fresh_amount=100, retur_amount=0),
            models.Product(id="p2", name="Kopi Sachet", quantity=500, price=1500, fresh_amount=500, retur_amount=0),
            models.Product(id="p3", name="Teh Kotak", quantity=200, price=3500, fresh_amount=200, retur_amount=0),
        ]
        db.add_all(products)
    
    db.commit()

# --- Pydantic Models ---
class LoginRequest(BaseModel):
    nik: str
    password: str

class UserResponse(BaseModel):
    nik: str
    name: str
    role: str

class Product(BaseModel):
    id: str
    name: str
    quantity: int
    price: float
    fresh_amount: int
    retur_amount: int

class OrderItem(BaseModel):
    product_id: str
    name: str
    quantity: int
    price: float

class ReturnItem(BaseModel):
    product_id: str
    name: str
    quantity: int

class VisitCreate(BaseModel):
    salesmanId: str
    storeId: str
    checkInTime: str
    checkOutTime: str
    orderAmount: float
    returAmount: float
    tagihanAmount: float
    status: str = "pending"
    attachment_url: Optional[str] = None
    items: Optional[List[OrderItem]] = None
    returns: Optional[List[ReturnItem]] = None

class UserCreate(BaseModel):
    nik: str
    password: str
    name: str
    role: str = "salesman"

class UserEdit(BaseModel):
    password: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None

class StoreEdit(BaseModel):
    salesmanId: str

# --- Endpoints ---

@app.post("/login", response_model=UserResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.nik == request.nik, models.User.password == request.password).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid NIK or Password")
    return {"nik": user.nik, "name": user.name, "role": user.role}

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [{"nik": u.nik, "name": u.name, "role": u.role} for u in users]

@app.post("/users")
def add_user(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.nik == user.nik).first():
        raise HTTPException(status_code=400, detail="NIK already exists")
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    return {"status": "success", "user": user}

@app.put("/users/{nik}")
def edit_user(nik: str, userData: UserEdit, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.nik == nik).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if userData.name: user.name = userData.name
    if userData.password: user.password = userData.password
    if userData.role: user.role = userData.role
    
    db.commit()
    return {"status": "success", "user": {"nik": user.nik, "name": user.name, "role": user.role}}

@app.get("/stores")
def get_stores(db: Session = Depends(get_db)):
    return db.query(models.Store).all()

@app.post("/stores")
async def register_store(
    name: str = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    salesmanId: str = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Save photo to uploads directory
    ext = os.path.splitext(photo.filename)[1]
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
    # Create store entry
    store_id = str(uuid.uuid4())
    store = models.Store(
        id=store_id,
        name=name,
        lat=lat,
        lon=lon,
        photo_url=f"/uploads/{unique_name}",
        historicalSales=0,
        historicalRetur=0,
        outstanding=0,
        salesmanId=salesmanId
    )
    db.add(store)
    db.commit()
    db.refresh(store)
    return {"status": "success", "store": store}

@app.put("/stores/{store_id}")
def edit_store(store_id: str, storeData: StoreEdit, db: Session = Depends(get_db)):
    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    store.salesmanId = storeData.salesmanId
    db.commit()
    return {"status": "success", "store": store}

# --- Product Endpoints ---

@app.get("/products")
def get_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()

@app.post("/products")
def add_product(product: Product, db: Session = Depends(get_db)):
    if db.query(models.Product).filter(models.Product.id == product.id).first():
        raise HTTPException(status_code=400, detail="Product ID already exists")
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    return {"status": "success", "product": product}

@app.put("/products/{product_id}")
def edit_product(product_id: str, productData: Product, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for key, value in productData.dict().items():
        setattr(product, key, value)
    
    db.commit()
    return {"status": "success", "product": product}

@app.delete("/products/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"status": "success"}

@app.get("/visits")
def get_all_visits(db: Session = Depends(get_db)):
    return db.query(models.Visit).all()

@app.get("/visits/{salesman_id}")
def get_visits(salesman_id: str, db: Session = Depends(get_db)):
    return db.query(models.Visit).filter(models.Visit.salesmanId == salesman_id).all()

@app.get("/visits/store/{store_id}")
def get_visits_by_store(store_id: str, db: Session = Depends(get_db)):
    return db.query(models.Visit).filter(models.Visit.storeId == store_id).all()

@app.post("/visits")
async def create_visit(
    salesmanId: str = Form(...),
    storeId: str = Form(...),
    checkInTime: str = Form(...),
    checkOutTime: str = Form(...),
    orderAmount: float = Form(...),
    returAmount: float = Form(...),
    tagihanAmount: float = Form(...),
    items: Optional[str] = Form(None),
    returns: Optional[str] = Form(None),
    attachment: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    parsed_items = json.loads(items) if items else []
    parsed_returns = json.loads(returns) if returns else []

    # If items are provided, orderAmount should be the sum
    if parsed_items:
        orderAmount = sum(item['quantity'] * item['price'] for item in parsed_items)
    
    if parsed_returns:
        val = 0
        for r in parsed_returns:
            prod = db.query(models.Product).filter(models.Product.id == r['product_id']).first()
            if prod:
                val += r['quantity'] * prod.price
        returAmount = val

    attachment_url = None
    if attachment:
        ext = os.path.splitext(attachment.filename)[1]
        unique_name = f"visit_{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(attachment.file, buffer)
        attachment_url = f"/uploads/{unique_name}"

    visit_id = str(int(time.time() * 1000))
    visit = models.Visit(
        id=visit_id,
        salesmanId=salesmanId,
        storeId=storeId,
        checkInTime=checkInTime,
        checkOutTime=checkOutTime,
        orderAmount=orderAmount,
        returAmount=returAmount,
        tagihanAmount=tagihanAmount,
        status="pending",
        attachment_url=attachment_url
    )

    # Calculate due date
    if orderAmount > 0:
        try:
            checkin_dt = datetime.fromisoformat(checkInTime.replace("Z", "+00:00"))
        except:
            checkin_dt = datetime.now()
        visit.dueDate = (checkin_dt + timedelta(days=3)).isoformat()

    # Payment Status Logic
    net_payable = orderAmount - returAmount
    if orderAmount > 0:
        if tagihanAmount >= net_payable:
            visit.paymentStatus = "Full Payment"
        elif tagihanAmount > 0:
            visit.paymentStatus = "Partial Payment"
        else:
            visit.paymentStatus = "Unpaid"
    else:
        visit.paymentStatus = "Collection Only" if tagihanAmount > 0 else "-"

    db.add(visit)

    # Add items and returns
    for item in parsed_items:
        db_item = models.VisitItem(
            visit_id=visit_id,
            product_id=item['product_id'],
            name=item['name'],
            quantity=item['quantity'],
            price=item['price']
        )
        db.add(db_item)
        # Deduct stock
        prod = db.query(models.Product).filter(models.Product.id == item['product_id']).first()
        if prod:
            prod.fresh_amount = max(0, prod.fresh_amount - item['quantity'])
            prod.quantity = prod.fresh_amount + prod.retur_amount

    for ret in parsed_returns:
        db_ret = models.VisitReturn(
            visit_id=visit_id,
            product_id=ret['product_id'],
            name=ret['name'],
            quantity=ret['quantity']
        )
        db.add(db_ret)
        # Adjust stock
        prod = db.query(models.Product).filter(models.Product.id == ret['product_id']).first()
        if prod:
            prod.retur_amount = prod.retur_amount + ret['quantity']
            prod.quantity = prod.fresh_amount + prod.retur_amount

    # Update store balance
    store = db.query(models.Store).filter(models.Store.id == storeId).first()
    if store:
        store.outstanding = store.outstanding + orderAmount - tagihanAmount - returAmount
        store.historicalSales = store.historicalSales + orderAmount
        store.historicalRetur = store.historicalRetur + returAmount

    db.commit()
    db.refresh(visit)
    return {"status": "success", "visit": visit}

@app.put("/visits/{visit_id}")
def edit_visit(visit_id: str, visit_update: VisitCreate, db: Session = Depends(get_db)):
    visit = db.query(models.Visit).filter(models.Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    store = db.query(models.Store).filter(models.Store.id == visit.storeId).first()
    if store and visit.status != "rejected":
        store.outstanding = store.outstanding - visit.orderAmount + visit.tagihanAmount + visit.returAmount
        store.historicalSales = store.historicalSales - visit.orderAmount
        store.historicalRetur = store.historicalRetur - visit.returAmount

    # Revert stock
    for item in visit.items:
        prod = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if prod:
            prod.fresh_amount = prod.fresh_amount + item.quantity
            prod.quantity = prod.fresh_amount + prod.retur_amount
    for ret in visit.returns:
        prod = db.query(models.Product).filter(models.Product.id == ret.product_id).first()
        if prod:
            prod.retur_amount = max(0, prod.retur_amount - ret.quantity)
            prod.quantity = prod.fresh_amount + prod.retur_amount

    # Update visit fields
    visit.status = "pending"
    
    # Delete old items and returns
    db.query(models.VisitItem).filter(models.VisitItem.visit_id == visit_id).delete()
    db.query(models.VisitReturn).filter(models.VisitReturn.visit_id == visit_id).delete()

    # Add new ones
    order_total = 0
    if visit_update.items:
        for item in visit_update.items:
            db_item = models.VisitItem(visit_id=visit_id, **item.dict())
            db.add(db_item)
            order_total += item.quantity * item.price
            # Deduct stock
            prod = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if prod:
                prod.fresh_amount = max(0, prod.fresh_amount - item.quantity)
                prod.quantity = prod.fresh_amount + prod.retur_amount
        visit.orderAmount = order_total
    else:
        visit.orderAmount = visit_update.orderAmount

    retur_total = 0
    if visit_update.returns:
        for ret in visit_update.returns:
            db_ret = models.VisitReturn(visit_id=visit_id, **ret.dict())
            db.add(db_ret)
            prod = db.query(models.Product).filter(models.Product.id == ret.product_id).first()
            if prod:
                retur_total += ret.quantity * prod.price
                prod.retur_amount = prod.retur_amount + ret.quantity
                prod.quantity = prod.fresh_amount + prod.retur_amount
        visit.returAmount = retur_total
    else:
        visit.returAmount = visit_update.returAmount

    visit.tagihanAmount = visit_update.tagihanAmount

    # Logic for due date and payment status
    if visit.orderAmount > 0 and visit.orderAmount != visit.tagihanAmount:
        try:
            checkin_dt = datetime.fromisoformat(visit.checkInTime.replace("Z", "+00:00"))
        except:
            checkin_dt = datetime.now()
        visit.dueDate = (checkin_dt + timedelta(days=3)).isoformat()
    else:
        visit.dueDate = None

    net_payable = visit.orderAmount - visit.returAmount
    if visit.orderAmount > 0:
        if visit.tagihanAmount >= net_payable:
            visit.paymentStatus = "Full Payment"
        elif visit.tagihanAmount > 0:
            visit.paymentStatus = "Partial Payment"
        else:
            visit.paymentStatus = "Unpaid"
    else:
        visit.paymentStatus = "Collection Only" if visit.tagihanAmount > 0 else "-"

    if store:
        store.outstanding = store.outstanding + visit.orderAmount - visit.tagihanAmount - visit.returAmount
        store.historicalSales = store.historicalSales + visit.orderAmount
        store.historicalRetur = store.historicalRetur + visit.returAmount

    db.commit()
    db.refresh(visit)
    return {"status": "success", "visit": visit}

@app.post("/visits/{visit_id}/validate")
def validate_visit(visit_id: str, db: Session = Depends(get_db)):
    visit = db.query(models.Visit).filter(models.Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    visit.status = "validated"
    db.commit()
    return {"status": "success", "visit": visit}

@app.delete("/visits/{visit_id}")
def delete_visit(visit_id: str, db: Session = Depends(get_db)):
    visit = db.query(models.Visit).filter(models.Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    # Restore stock
    for item in visit.items:
        prod = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if prod:
            prod.fresh_amount = prod.fresh_amount + item.quantity
            prod.quantity = prod.fresh_amount + prod.retur_amount
    for ret in visit.returns:
        prod = db.query(models.Product).filter(models.Product.id == ret.product_id).first()
        if prod:
            prod.retur_amount = max(0, prod.retur_amount - ret.quantity)
            prod.quantity = prod.fresh_amount + prod.retur_amount

    # Revert store balance
    if visit.status != "rejected":
        store = db.query(models.Store).filter(models.Store.id == visit.storeId).first()
        if store:
            store.outstanding = store.outstanding - visit.orderAmount + visit.tagihanAmount + visit.returAmount
            store.historicalSales = store.historicalSales - visit.orderAmount
            store.historicalRetur = store.historicalRetur - visit.returAmount

    db.delete(visit)
    db.commit()
    return {"status": "success"}

@app.post("/visits/{visit_id}/reject")
def reject_visit(visit_id: str, db: Session = Depends(get_db)):
    visit = db.query(models.Visit).filter(models.Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    if visit.status == "rejected":
        return {"status": "already rejected"}

    # Restore stock
    for item in visit.items:
        prod = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if prod:
            prod.fresh_amount = prod.fresh_amount + item.quantity
            prod.quantity = prod.fresh_amount + prod.retur_amount

    for ret in visit.returns:
        prod = db.query(models.Product).filter(models.Product.id == ret.product_id).first()
        if prod:
            prod.retur_amount = max(0, prod.retur_amount - ret.quantity)
            prod.quantity = prod.fresh_amount + prod.retur_amount

    # Revert store balance
    store = db.query(models.Store).filter(models.Store.id == visit.storeId).first()
    if store:
        store.outstanding = store.outstanding - visit.orderAmount + visit.tagihanAmount + visit.returAmount
        store.historicalSales = store.historicalSales - visit.orderAmount
        store.historicalRetur = store.historicalRetur - visit.returAmount

    visit.status = "rejected"
    db.commit()
    return {"status": "success"}

@app.get("/stats/admin")
def get_admin_stats(db: Session = Depends(get_db)):
    now = datetime.now()
    current_month = now.month
    current_year = now.year
    seven_days_ago = (now - timedelta(days=7)).isoformat()

    visits = db.query(models.Visit).all()
    
    sales_mtd = 0
    retur_mtd = 0
    active_store_ids = set()

    for v in visits:
        if v.status == "rejected": continue
        try:
            visit_date = datetime.fromisoformat(v.checkInTime.replace("Z", "+00:00"))
        except:
            continue
            
        if visit_date.month == current_month and visit_date.year == current_year:
            sales_mtd += v.orderAmount
            retur_mtd += v.returAmount
            
        if v.checkInTime >= seven_days_ago and v.orderAmount > 0:
            active_store_ids.add(v.storeId)

    total_stores = db.query(models.Store).count()
    active_count = len(active_store_ids)
    total_outstanding_rows = db.query(models.Store).with_entities(models.Store.outstanding).all()
    total_outstanding = sum(s[0] for s in total_outstanding_rows)

    return {
        "sales_mtd": sales_mtd,
        "retur_mtd": retur_mtd,
        "total_outstanding": total_outstanding,
        "active_stores": active_count,
        "inactive_stores": total_stores - active_count,
        "total_stores": total_stores
    }

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 9000))
    uvicorn.run("main:app", host=host, port=port, reload=True)
