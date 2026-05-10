from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import time
from datetime import datetime, timedelta
import os
import uuid
import shutil
from dotenv import load_dotenv

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

# --- Mock Data ---
dummy_users = [
    {"nik": "12345", "password": "password", "role": "salesman", "name": "Usman"},
    {"nik": "admin", "password": "admin", "role": "admin", "name": "Admin User"}
]

dummy_stores = []
visits_db = []
dummy_products = [
    {"id": "p1", "name": "Susu UHT 250ml", "quantity": 100, "price": 5000, "fresh_amount": 100, "retur_amount": 0},
    {"id": "p2", "name": "Kopi Sachet", "quantity": 500, "price": 1500, "fresh_amount": 500, "retur_amount": 0},
    {"id": "p3", "name": "Teh Kotak", "quantity": 200, "price": 3500, "fresh_amount": 200, "retur_amount": 0},
]

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
def login(request: LoginRequest):
    user = next((u for u in dummy_users if u["nik"] == request.nik and u["password"] == request.password), None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid NIK or Password")
    return {"nik": user["nik"], "name": user["name"], "role": user["role"]}

@app.get("/users")
def get_users():
    return [{"nik": u["nik"], "name": u["name"], "role": u["role"]} for u in dummy_users]

@app.post("/users")
def add_user(user: UserCreate):
    if any(u["nik"] == user.nik for u in dummy_users):
        raise HTTPException(status_code=400, detail="NIK already exists")
    dummy_users.append(user.dict())
    return {"status": "success", "user": user}

@app.put("/users/{nik}")
def edit_user(nik: str, userData: UserEdit):
    user = next((u for u in dummy_users if u["nik"] == nik), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if userData.name: user["name"] = userData.name
    if userData.password: user["password"] = userData.password
    if userData.role: user["role"] = userData.role
    
    return {"status": "success", "user": user}

@app.get("/stores")
def get_stores():
    return dummy_stores

@app.post("/stores")
async def register_store(
    name: str = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    salesmanId: str = Form(...),
    photo: UploadFile = File(...)
):
    # Save photo to uploads directory
    ext = os.path.splitext(photo.filename)[1]
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
    # Create store entry
    store_id = str(uuid.uuid4())
    store = {
        "id": store_id,
        "name": name,
        "lat": lat,
        "lon": lon,
        "photo_url": f"/uploads/{unique_name}",
        "historicalSales": 0,
        "historicalRetur": 0,
        "outstanding": 0,
        "salesmanId": salesmanId
    }
    dummy_stores.append(store)
    return {"status": "success", "store": store}

@app.put("/stores/{store_id}")
def edit_store(store_id: str, storeData: StoreEdit):
    store = next((s for s in dummy_stores if s["id"] == store_id), None)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    store["salesmanId"] = storeData.salesmanId
    return {"status": "success", "store": store}

# --- Product Endpoints ---

@app.get("/products")
def get_products():
    return dummy_products

@app.post("/products")
def add_product(product: Product):
    if any(p["id"] == product.id for p in dummy_products):
        raise HTTPException(status_code=400, detail="Product ID already exists")
    dummy_products.append(product.dict())
    return {"status": "success", "product": product}

@app.put("/products/{product_id}")
def edit_product(product_id: str, productData: Product):
    product = next((p for p in dummy_products if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.update(productData.dict())
    return {"status": "success", "product": product}

@app.delete("/products/{product_id}")
def delete_product(product_id: str):
    global dummy_products
    dummy_products = [p for p in dummy_products if p["id"] != product_id]
    return {"status": "success"}

@app.get("/visits")
def get_all_visits():
    return visits_db

@app.get("/visits/{salesman_id}")
def get_visits(salesman_id: str):
    return [v for v in visits_db if v["salesmanId"] == salesman_id]

@app.get("/visits/store/{store_id}")
def get_visits_by_store(store_id: str):
    return [v for v in visits_db if v["storeId"] == store_id]

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
    attachment: Optional[UploadFile] = File(None)
):
    import json
    parsed_items = json.loads(items) if items else []
    parsed_returns = json.loads(returns) if returns else []

    # If items are provided, orderAmount should be the sum
    if parsed_items:
        orderAmount = sum(item['quantity'] * item['price'] for item in parsed_items)
    
    # If returns are provided, returAmount should be the sum
    # (Note: we might need price for returns too if we want to be exact, 
    # but for now let's assume salesman inputs the return value or we fetch it)
    # The requirement says "input what item and how many", usually value is calculated from current price.
    if parsed_returns:
        # Calculate return amount based on product price
        val = 0
        for r in parsed_returns:
            prod = next((p for p in dummy_products if p["id"] == r['product_id']), None)
            if prod:
                val += r['quantity'] * prod['price']
        returAmount = val

    attachment_url = None
    if attachment:
        ext = os.path.splitext(attachment.filename)[1]
        unique_name = f"visit_{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(attachment.file, buffer)
        attachment_url = f"/uploads/{unique_name}"

    visit_dict = {
        "id": str(int(time.time() * 1000)),
        "salesmanId": salesmanId,
        "storeId": storeId,
        "checkInTime": checkInTime,
        "checkOutTime": checkOutTime,
        "orderAmount": orderAmount,
        "returAmount": returAmount,
        "tagihanAmount": tagihanAmount,
        "items": parsed_items,
        "returns": parsed_returns,
        "status": "pending",
        "attachment_url": attachment_url
    }

    # Calculate due date: 3 days after check-in, ONLY if there is an order
    if orderAmount > 0:
        try:
            checkin_dt = datetime.fromisoformat(checkInTime.replace("Z", "+00:00"))
        except:
            checkin_dt = datetime.now()
        visit_dict["dueDate"] = (checkin_dt + timedelta(days=3)).isoformat()
    else:
        visit_dict["dueDate"] = None

    # Payment Status Logic
    net_payable = orderAmount - returAmount
    if orderAmount > 0:
        if tagihanAmount >= net_payable:
            visit_dict["paymentStatus"] = "Full Payment"
        elif tagihanAmount > 0:
            visit_dict["paymentStatus"] = "Partial Payment"
        else:
            visit_dict["paymentStatus"] = "Unpaid"
    else:
        visit_dict["paymentStatus"] = "Collection Only" if tagihanAmount > 0 else "-"

    visits_db.append(visit_dict)

    # Update the store's outstanding and historical amounts immediately (Live Stats)
    store = next((s for s in dummy_stores if s["id"] == storeId), None)
    if store:
        store["outstanding"] = store.get("outstanding", 0) + orderAmount - tagihanAmount - returAmount
        store["historicalSales"] = store.get("historicalSales", 0) + orderAmount
        store["historicalRetur"] = store.get("historicalRetur", 0) + returAmount

    # Deduct stock immediately (pending)
    for item in parsed_items:
        prod = next((p for p in dummy_products if p["id"] == item['product_id']), None)
        if prod:
            prod["fresh_amount"] = max(0, prod["fresh_amount"] - item['quantity'])
            prod["quantity"] = prod["fresh_amount"] + prod["retur_amount"]

    for ret in parsed_returns:
        prod = next((p for p in dummy_products if p["id"] == ret['product_id']), None)
        if prod:
            prod["retur_amount"] = prod["retur_amount"] + ret['quantity']
            prod["quantity"] = prod["fresh_amount"] + prod["retur_amount"]

    return {"status": "success", "visit": visit_dict}

@app.put("/visits/{visit_id}")
def edit_visit(visit_id: str, visit_update: VisitCreate):
    visit = next((v for v in visits_db if v["id"] == visit_id), None)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    # Update store balance immediately (Live Stats)
    store = next((s for s in dummy_stores if s["id"] == visit["storeId"]), None)
    if store and visit["status"] != "rejected":
        # Revert old visit impact
        store["outstanding"] = store.get("outstanding", 0) - visit["orderAmount"] + visit["tagihanAmount"] + visit["returAmount"]
        store["historicalSales"] = store.get("historicalSales", 0) - visit["orderAmount"]
        store["historicalRetur"] = store.get("historicalRetur", 0) - visit["returAmount"]

    # If it was already validated, store original data for rollback
    if visit["status"] == "validated":
        # Store a deep copy for rollback
        import copy
        visit["_original"] = copy.deepcopy(visit)

    # Reset status to pending after edit
    visit["status"] = "pending"

    # Revert old stock adjustment
    for item in visit.get("items", []):
        prod = next((p for p in dummy_products if p["id"] == item['product_id']), None)
        if prod:
            prod["fresh_amount"] = prod["fresh_amount"] + item['quantity']
            prod["quantity"] = prod["fresh_amount"] + prod["retur_amount"]

    for ret in visit.get("returns", []):
        prod = next((p for p in dummy_products if p["id"] == ret['product_id']), None)
        if prod:
            prod["retur_amount"] = max(0, prod["retur_amount"] - ret['quantity'])
            prod["quantity"] = prod["fresh_amount"] + prod["retur_amount"]

    # Update visit fields
    visit["items"] = [item.dict() for item in (visit_update.items or [])]
    visit["returns"] = [item.dict() for item in (visit_update.returns or [])]

    # Recalculate amounts if items/returns are provided
    if visit["items"]:
        visit["orderAmount"] = sum(item['quantity'] * item['price'] for item in visit["items"])
    else:
        visit["orderAmount"] = visit_update.orderAmount

    if visit["returns"]:
        val = 0
        for r in visit["returns"]:
            prod = next((p for p in dummy_products if p["id"] == r['product_id']), None)
            if prod:
                val += r['quantity'] * prod['price']
        visit["returAmount"] = val
    else:
        visit["returAmount"] = visit_update.returAmount

    visit["tagihanAmount"] = visit_update.tagihanAmount

    # Apply new stock adjustment
    for item in visit.get("items", []):
        prod = next((p for p in dummy_products if p["id"] == item['product_id']), None)
        if prod:
            prod["fresh_amount"] = max(0, prod["fresh_amount"] - item['quantity'])
            prod["quantity"] = prod["fresh_amount"] + prod["retur_amount"]

    for ret in visit.get("returns", []):
        prod = next((p for p in dummy_products if p["id"] == ret['product_id']), None)
        if prod:
            prod["retur_amount"] = prod["retur_amount"] + ret['quantity']
            prod["quantity"] = prod["fresh_amount"] + prod["retur_amount"]
    
    # Logic: if order is fully paid by collection, no due date
    if visit["orderAmount"] > 0 and visit["orderAmount"] != visit["tagihanAmount"]:
        try:
            checkin_dt = datetime.fromisoformat(visit["checkInTime"].replace("Z", "+00:00"))
        except:
            checkin_dt = datetime.now()
        visit["dueDate"] = (checkin_dt + timedelta(days=3)).isoformat()
    else:
        visit["dueDate"] = None

    # Payment Status Logic
    net_payable = visit["orderAmount"] - visit["returAmount"]
    if visit["orderAmount"] > 0:
        if visit["tagihanAmount"] >= net_payable:
            visit["paymentStatus"] = "Full Payment"
        elif visit["tagihanAmount"] > 0:
            visit["paymentStatus"] = "Partial Payment"
        else:
            visit["paymentStatus"] = "Unpaid"
    else:
        visit["paymentStatus"] = "Collection Only" if visit["tagihanAmount"] > 0 else "-"

    # Apply new store balance impact (Live Stats)
    if store and visit["status"] != "rejected":
        store["outstanding"] = store.get("outstanding", 0) + visit["orderAmount"] - visit["tagihanAmount"] - visit["returAmount"]
        store["historicalSales"] = store.get("historicalSales", 0) + visit["orderAmount"]
        store["historicalRetur"] = store.get("historicalRetur", 0) + visit["returAmount"]

    return {"status": "success", "visit": visit}

@app.post("/visits/{visit_id}/validate")
def validate_visit(visit_id: str):
    visit = next((v for v in visits_db if v["id"] == visit_id), None)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    if visit["status"] == "validated":
        return {"status": "already validated", "visit": visit}

    visit["status"] = "validated"

    # Store stats are already updated on create/edit
    
    # Update the store's outstanding and historical amounts
    store = next((s for s in dummy_stores if s["id"] == visit["storeId"]), None)
    if store:
        # Re-check logic for validation time
        net_payable = visit["orderAmount"] - visit["returAmount"]
        if visit["tagihanAmount"] >= net_payable:
            visit["dueDate"] = None
            visit["paymentStatus"] = "Full Payment"

    # No stock update here as it's already done on create
    return {"status": "success", "visit": visit}

@app.delete("/visits/{visit_id}")
def delete_visit(visit_id: str):
    global visits_db
    visit = next((v for v in visits_db if v["id"] == visit_id), None)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    # Restore stock
    for item in visit.get("items", []):
        prod = next((p for p in dummy_products if p["id"] == item['product_id']), None)
        if prod:
            prod["fresh_amount"] = prod["fresh_amount"] + item['quantity']
            prod["quantity"] = prod["fresh_amount"] + prod["retur_amount"]

    for ret in visit.get("returns", []):
        prod = next((p for p in dummy_products if p["id"] == ret['product_id']), None)
        if prod:
            prod["retur_amount"] = max(0, prod["retur_amount"] - ret['quantity'])
            prod["quantity"] = prod["fresh_amount"] + prod["retur_amount"]

    # Revert store balance (Live Stats)
    if visit["status"] != "rejected":
        store = next((s for s in dummy_stores if s["id"] == visit["storeId"]), None)
        if store:
            store["outstanding"] = store.get("outstanding", 0) - visit["orderAmount"] + visit["tagihanAmount"] + visit["returAmount"]
            store["historicalSales"] = store.get("historicalSales", 0) - visit["orderAmount"]
            store["historicalRetur"] = store.get("historicalRetur", 0) - visit["returAmount"]

    visits_db = [v for v in visits_db if v["id"] != visit_id]
    return {"status": "success"}

@app.post("/visits/{visit_id}/reject")
def reject_visit(visit_id: str):
    visit = next((v for v in visits_db if v["id"] == visit_id), None)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    if visit["status"] == "rejected":
        return {"status": "already rejected"}

    # If this was an edit of a previously validated visit, roll back to original
    if "_original" in visit:
        original = visit["_original"]
        
        # Revert current pending edit impact (Live Stats)
        store = next((s for s in dummy_stores if s["id"] == visit["storeId"]), None)
        if store:
            store["outstanding"] = store.get("outstanding", 0) - visit["orderAmount"] + visit["tagihanAmount"] + visit["returAmount"]
            store["historicalSales"] = store.get("historicalSales", 0) - visit["orderAmount"]
            store["historicalRetur"] = store.get("historicalRetur", 0) - visit["returAmount"]

        # Restore original visit data
        visit.clear()
        visit.update(original)
        
        # Restore original store balance (Live Stats)
        if store:
            store["outstanding"] = store.get("outstanding", 0) + visit["orderAmount"] - visit["tagihanAmount"] - visit["returAmount"]
            store["historicalSales"] = store.get("historicalSales", 0) + visit["orderAmount"]
            store["historicalRetur"] = store.get("historicalRetur", 0) + visit["returAmount"]
        
        # Restore original stock adjustment
        for item in visit.get("items", []):
            prod = next((p for p in dummy_products if p["id"] == item['product_id']), None)
            if prod:
                prod["fresh_amount"] = max(0, prod["fresh_amount"] - item['quantity'])
                prod["quantity"] = prod["fresh_amount"] + prod["retur_amount"]
        for ret in visit.get("returns", []):
            prod = next((p for p in dummy_products if p["id"] == ret['product_id']), None)
            if prod:
                prod["retur_amount"] = prod["retur_amount"] + ret['quantity']
                prod["quantity"] = prod["fresh_amount"] + prod["retur_amount"]
        
        return {"status": "success", "message": "Rolled back to previous approved state"}

    # Restore stock for new visit
    for item in visit.get("items", []):
        prod = next((p for p in dummy_products if p["id"] == item['product_id']), None)
        if prod:
            prod["fresh_amount"] = prod["fresh_amount"] + item['quantity']
            prod["quantity"] = prod["fresh_amount"] + prod["retur_amount"]

    for ret in visit.get("returns", []):
        prod = next((p for p in dummy_products if p["id"] == ret['product_id']), None)
        if prod:
            prod["retur_amount"] = max(0, prod["retur_amount"] - ret['quantity'])
            prod["quantity"] = prod["fresh_amount"] + prod["retur_amount"]

    # Revert store balance if it was not already rejected (Live Stats)
    if visit["status"] != "rejected":
        store = next((s for s in dummy_stores if s["id"] == visit["storeId"]), None)
        if store:
            store["outstanding"] = store.get("outstanding", 0) - visit["orderAmount"] + visit["tagihanAmount"] + visit["returAmount"]
            store["historicalSales"] = store.get("historicalSales", 0) - visit["orderAmount"]
            store["historicalRetur"] = store.get("historicalRetur", 0) - visit["returAmount"]

    visit["status"] = "rejected"
    return {"status": "success"}

@app.get("/stats/admin")
def get_admin_stats():
    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)
    current_month = now.month
    current_year = now.year

    sales_mtd = 0
    retur_mtd = 0
    
    active_store_ids = set()
    # Count validated visits OR the original state of pending edits
    relevant_visits = []
    for v in visits_db:
        if v["status"] == "validated":
            relevant_visits.append(v)
        elif v["status"] == "pending" and "_original" in v:
            relevant_visits.append(v["_original"])
    
    for v in relevant_visits:
        visit_date = datetime.fromisoformat(v["checkInTime"].replace("Z", "+00:00")).replace(tzinfo=None)
        
        if visit_date.month == current_month and visit_date.year == current_year:
            sales_mtd += v["orderAmount"]
            retur_mtd += v["returAmount"]
            
        if visit_date >= seven_days_ago and v["orderAmount"] > 0:
            active_store_ids.add(v["storeId"])

    total_outstanding = sum(s.get("outstanding", 0) for s in dummy_stores)
    total_stores = len(dummy_stores)
    active_count = len(active_store_ids)
    inactive_count = total_stores - active_count

    return {
        "sales_mtd": sales_mtd,
        "retur_mtd": retur_mtd,
        "total_outstanding": total_outstanding,
        "active_stores": active_count,
        "inactive_stores": inactive_count,
        "total_stores": total_stores
    }

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 9000))
    uvicorn.run("main:app", host=host, port=port, reload=True)
