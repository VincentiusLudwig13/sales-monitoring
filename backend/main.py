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
from sqlalchemy.orm import Session, joinedload
from dotenv import load_dotenv

from database import engine, get_db
import models

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# --- Pydantic Models ---
class UserBase(BaseModel):
    nik: str
    name: str
    role: str

class LoginRequest(BaseModel):
    nik: str
    password: str

class VisitItemBase(BaseModel):
    product_id: str
    name: str
    quantity: int
    price: float
    class Config:
        orm_mode = True

class AttachmentBase(BaseModel):
    id: int
    url: str
    filename: str
    class Config:
        orm_mode = True

class VisitReturnBase(BaseModel):
    product_id: str
    name: str
    quantity: int
    class Config:
        orm_mode = True

class Visit(BaseModel):
    id: str
    salesmanId: str
    storeId: str
    checkInTime: str
    checkOutTime: str
    orderAmount: float
    returAmount: float
    tagihanAmount: float
    status: str
    attachment_url: Optional[str] = None
    dueDate: Optional[str] = None
    paymentStatus: Optional[str] = None
    items: List[VisitItemBase] = []
    returns: List[VisitReturnBase] = []
    attachments: List[AttachmentBase] = []
    class Config:
        orm_mode = True

# --- API Endpoints ---

@app.post("/api/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.nik == req.nik).first()
    if not user or user.password != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"nik": user.nik, "name": user.name, "role": user.role}

# --- Users ---
@app.get("/api/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [{"nik": u.nik, "name": u.name, "role": u.role} for u in users]

@app.post("/api/users")
def add_user(user: dict, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.nik == user['nik']).first():
        raise HTTPException(status_code=400, detail="NIK already exists")
    db_user = models.User(**user)
    db.add(db_user)
    db.commit()
    return {"status": "success"}

@app.put("/api/users/{nik}")
def edit_user(nik: str, user_data: dict, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.nik == nik).first()
    if not db_user: raise HTTPException(status_code=404)
    for k, v in user_data.items(): setattr(db_user, k, v)
    db.commit()
    return {"status": "success"}

# --- Stores ---
@app.get("/api/stores")
def get_stores(db: Session = Depends(get_db)):
    return db.query(models.Store).options(joinedload(models.Store.attachments)).all()

@app.post("/api/stores")
async def create_store(
    name: str = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    salesmanId: str = Form("unknown"),
    photos: List[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    store_id = str(uuid.uuid4())
    main_photo_url = None
    
    db_store = models.Store(
        id=store_id, name=name, lat=lat, lon=lon,
        photo_url=None, salesmanId=salesmanId,
        historicalSales=0.0, historicalRetur=0.0, outstanding=0.0
    )
    db.add(db_store)

    if photos:
        for idx, photo in enumerate(photos):
            ext = os.path.splitext(photo.filename)[1]
            unique_name = f"store_{store_id}_{uuid.uuid4()}{ext}"
            file_path = os.path.join(UPLOAD_DIR, unique_name)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(photo.file, buffer)
            
            url = f"/uploads/{unique_name}"
            if idx == 0: main_photo_url = url
            
            db_att = models.Attachment(store_id=store_id, url=url, filename=photo.filename)
            db.add(db_att)
    
    db_store.photo_url = main_photo_url
    db.commit()
    return {"status": "success", "store": db_store}

@app.put("/api/stores/{id}")
async def update_store(
    id: str,
    name: Optional[str] = Form(None),
    lat: Optional[float] = Form(None),
    lon: Optional[float] = Form(None),
    salesmanId: Optional[str] = Form(None),
    new_photos: List[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    store = db.query(models.Store).filter(models.Store.id == id).first()
    if not store: raise HTTPException(status_code=404)
    
    if name is not None: store.name = name
    if lat is not None: store.lat = lat
    if lon is not None: store.lon = lon
    if salesmanId is not None: store.salesmanId = salesmanId

    if new_photos:
        for photo in new_photos:
            ext = os.path.splitext(photo.filename)[1]
            unique_name = f"store_{id}_{uuid.uuid4()}{ext}"
            file_path = os.path.join(UPLOAD_DIR, unique_name)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(photo.file, buffer)
            
            url = f"/uploads/{unique_name}"
            db_att = models.Attachment(store_id=id, url=url, filename=photo.filename)
            db.add(db_att)
            if not store.photo_url: store.photo_url = url
            
    db.commit()
    return {"status": "success"}

# --- Products ---
@app.get("/api/products")
def get_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()

@app.post("/api/products")
def create_product(prod: dict, db: Session = Depends(get_db)):
    db_prod = models.Product(**prod)
    db.add(db_prod)
    db.commit()
    return {"status": "success"}

@app.put("/api/products/{id}")
def update_product(id: str, prod: dict, db: Session = Depends(get_db)):
    db_prod = db.query(models.Product).filter(models.Product.id == id).first()
    if not db_prod: raise HTTPException(status_code=404)
    for k, v in prod.items(): setattr(db_prod, k, v)
    db.commit()
    return {"status": "success"}

@app.delete("/api/products/{id}")
def delete_product(id: str, db: Session = Depends(get_db)):
    db_prod = db.query(models.Product).filter(models.Product.id == id).first()
    if db_prod:
        db.delete(db_prod)
        db.commit()
    return {"status": "success"}

# --- Visits ---
@app.post("/api/visits")
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
    attachments: List[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    parsed_items = json.loads(items) if items else []
    parsed_returns = json.loads(returns) if returns else []

    visit_id = str(int(time.time() * 1000))
    main_att_url = None
    
    visit = models.Visit(
        id=visit_id, salesmanId=salesmanId, storeId=storeId,
        checkInTime=checkInTime, checkOutTime=checkOutTime,
        orderAmount=orderAmount, returAmount=returAmount,
        tagihanAmount=tagihanAmount, status="pending",
        attachment_url=None
    )
    db.add(visit)

    if attachments:
        for idx, att in enumerate(attachments):
            ext = os.path.splitext(att.filename)[1]
            unique_name = f"visit_{visit_id}_{uuid.uuid4()}{ext}"
            file_path = os.path.join(UPLOAD_DIR, unique_name)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(att.file, buffer)
            
            url = f"/uploads/{unique_name}"
            if idx == 0: main_att_url = url
            
            db_att = models.Attachment(visit_id=visit_id, url=url, filename=att.filename)
            db.add(db_att)

    visit.attachment_url = main_att_url

    if orderAmount > 0:
        try:
            checkin_dt = datetime.fromisoformat(checkInTime.replace("Z", "+00:00"))
        except:
            checkin_dt = datetime.now()
        visit.dueDate = (checkin_dt + timedelta(days=3)).isoformat()

    if tagihanAmount > 0 and orderAmount == 0:
        visit.paymentStatus = "Paid"
    elif tagihanAmount >= orderAmount and orderAmount > 0:
        visit.paymentStatus = "Paid"
    elif tagihanAmount > 0:
        visit.paymentStatus = "Partial"
    else:
        visit.paymentStatus = "Collection Only" if tagihanAmount > 0 else "-"

    for item in parsed_items:
        db_item = models.VisitItem(
            visit_id=visit_id, product_id=item['product_id'],
            name=item['name'], quantity=item['quantity'], price=item['price']
        )
        db.add(db_item)
        prod = db.query(models.Product).filter(models.Product.id == item['product_id']).first()
        if prod:
            prod.fresh_amount = max(0, prod.fresh_amount - item['quantity'])
            prod.quantity = prod.fresh_amount + prod.retur_amount

    for ret in parsed_returns:
        db_ret = models.VisitReturn(
            visit_id=visit_id, product_id=ret['product_id'],
            name=ret['name'], quantity=ret['quantity']
        )
        db.add(db_ret)
        prod = db.query(models.Product).filter(models.Product.id == ret['product_id']).first()
        if prod:
            prod.retur_amount = prod.retur_amount + ret['quantity']
            prod.quantity = prod.fresh_amount + prod.retur_amount

    # NOTE: Store balances are now updated ONLY upon validation, not creation.
    
    db.commit()
    return {"status": "success", "visit_id": visit_id}

@app.get("/api/visits")
def get_all_visits(db: Session = Depends(get_db)):
    return db.query(models.Visit).options(
        joinedload(models.Visit.items), 
        joinedload(models.Visit.returns),
        joinedload(models.Visit.attachments)
    ).all()

@app.get("/api/visits/{salesman_id}")
def get_visits(salesman_id: str, db: Session = Depends(get_db)):
    return db.query(models.Visit).options(
        joinedload(models.Visit.items), 
        joinedload(models.Visit.returns),
        joinedload(models.Visit.attachments)
    ).filter(models.Visit.salesmanId == salesman_id).all()

@app.get("/api/visits/store/{store_id}")
def get_visits_by_store(store_id: str, db: Session = Depends(get_db)):
    return db.query(models.Visit).options(
        joinedload(models.Visit.items), 
        joinedload(models.Visit.returns),
        joinedload(models.Visit.attachments)
    ).filter(models.Visit.storeId == store_id).all()

@app.post("/api/visits/{id}/validate")
def validate_visit(id: str, db: Session = Depends(get_db)):
    visit = db.query(models.Visit).filter(models.Visit.id == id).first()
    if not visit: raise HTTPException(status_code=404)
    if visit.status == "validated": return {"status": "already validated"}
    
    visit.status = "validated"
    
    # Update store balance ONLY now
    store = db.query(models.Store).filter(models.Store.id == visit.storeId).first()
    if store:
        store.outstanding = store.outstanding + visit.orderAmount - visit.tagihanAmount - visit.returAmount
        store.historicalSales = store.historicalSales + visit.orderAmount
        
    db.commit()
    return {"status": "success"}

@app.post("/api/visits/{id}/reject")
def reject_visit(id: str, db: Session = Depends(get_db)):
    visit = db.query(models.Visit).filter(models.Visit.id == id).first()
    if not visit: raise HTTPException(status_code=404)
    visit.status = "rejected"
    # Revert store balance
    store = db.query(models.Store).filter(models.Store.id == visit.storeId).first()
    if store:
        store.outstanding = store.outstanding - visit.orderAmount + visit.tagihanAmount + visit.returAmount
    db.commit()
    return {"status": "success"}

@app.delete("/api/visits/{id}")
def delete_visit(id: str, db: Session = Depends(get_db)):
    visit = db.query(models.Visit).filter(models.Visit.id == id).first()
    if visit:
        # Revert store balance before deleting
        store = db.query(models.Store).filter(models.Store.id == visit.storeId).first()
        if store and visit.status != "rejected":
            store.outstanding = store.outstanding - visit.orderAmount + visit.tagihanAmount + visit.returAmount
        db.delete(visit)
        db.commit()
    return {"status": "success"}

@app.put("/api/visits/{id}")
async def update_visit(
    id: str,
    orderAmount: Optional[float] = Form(None),
    returAmount: Optional[float] = Form(None),
    tagihanAmount: Optional[float] = Form(None),
    paymentStatus: Optional[str] = Form(None),
    items: Optional[str] = Form(None),
    returns: Optional[str] = Form(None),
    new_attachments: List[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    visit = db.query(models.Visit).filter(models.Visit.id == id).first()
    if not visit: raise HTTPException(status_code=404)
    
    store = db.query(models.Store).filter(models.Store.id == visit.storeId).first()
    
    if store and visit.status == "validated":
        store.outstanding = store.outstanding - visit.orderAmount + visit.tagihanAmount + visit.returAmount
        store.historicalSales = store.historicalSales - visit.orderAmount

    if orderAmount is not None: visit.orderAmount = orderAmount
    if returAmount is not None: visit.returAmount = returAmount
    if tagihanAmount is not None: visit.tagihanAmount = tagihanAmount
    if paymentStatus is not None: visit.paymentStatus = paymentStatus
    
    visit.status = "pending"

    if items:
        parsed_items = json.loads(items)
        db.query(models.VisitItem).filter(models.VisitItem.visit_id == id).delete()
        for item in parsed_items:
            db_item = models.VisitItem(
                visit_id=id, product_id=item['product_id'],
                name=item['name'], quantity=item['quantity'], price=item['price']
            )
            db.add(db_item)

    if returns:
        parsed_returns = json.loads(returns)
        db.query(models.VisitReturn).filter(models.VisitReturn.visit_id == id).delete()
        for ret in parsed_returns:
            db_ret = models.VisitReturn(
                visit_id=id, product_id=ret['product_id'],
                name=ret['name'], quantity=ret['quantity']
            )
            db.add(db_ret)

    if new_attachments:
        for att in new_attachments:
            ext = os.path.splitext(att.filename)[1]
            unique_name = f"visit_{id}_{uuid.uuid4()}{ext}"
            file_path = os.path.join(UPLOAD_DIR, unique_name)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(att.file, buffer)
            
            url = f"/uploads/{unique_name}"
            db_att = models.Attachment(visit_id=id, url=url, filename=att.filename)
            db.add(db_att)
            if not visit.attachment_url: visit.attachment_url = url
        
    db.commit()
    return {"status": "success"}

# --- Admin Stats ---
@app.get("/api/stats/admin")
def get_admin_stats(db: Session = Depends(get_db)):
    now = datetime.now()
    current_month = now.month
    current_year = now.year
    visits = db.query(models.Visit).all()
    sales_mtd = 0
    retur_mtd = 0
    for v in visits:
        if v.status != "validated": continue
        try:
            visit_date = datetime.fromisoformat(v.checkInTime.replace("Z", "+00:00"))
        except:
            continue
        if visit_date.month == current_month and visit_date.year == current_year:
            sales_mtd += v.orderAmount
            retur_mtd += v.returAmount
    total_stores = db.query(models.Store).count()
    total_outstanding = sum(s[0] for s in db.query(models.Store.outstanding).all())
    return {
        "sales_mtd": sales_mtd, "retur_mtd": retur_mtd,
        "total_outstanding": total_outstanding, "total_stores": total_stores
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
