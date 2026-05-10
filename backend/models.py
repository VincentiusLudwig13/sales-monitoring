from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    nik = Column(String, primary_key=True, index=True)
    password = Column(String)
    name = Column(String)
    role = Column(String)

class Store(Base):
    __tablename__ = "stores"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    photo_url = Column(String)
    historicalSales = Column(Float, default=0)
    historicalRetur = Column(Float, default=0)
    outstanding = Column(Float, default=0)
    salesmanId = Column(String) # For now, simple string link

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    quantity = Column(Integer)
    price = Column(Float)
    fresh_amount = Column(Integer)
    retur_amount = Column(Integer)

class Visit(Base):
    __tablename__ = "visits"

    id = Column(String, primary_key=True, index=True)
    salesmanId = Column(String)
    storeId = Column(String)
    checkInTime = Column(String)
    checkOutTime = Column(String)
    orderAmount = Column(Float)
    returAmount = Column(Float)
    tagihanAmount = Column(Float)
    status = Column(String, default="pending")
    attachment_url = Column(String, nullable=True)
    dueDate = Column(String, nullable=True)
    paymentStatus = Column(String, nullable=True)

    items = relationship("VisitItem", back_populates="visit", cascade="all, delete-orphan")
    returns = relationship("VisitReturn", back_populates="visit", cascade="all, delete-orphan")

class VisitItem(Base):
    __tablename__ = "visit_items"

    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(String, ForeignKey("visits.id"))
    product_id = Column(String)
    name = Column(String)
    quantity = Column(Integer)
    price = Column(Float)

    visit = relationship("Visit", back_populates="items")

class VisitReturn(Base):
    __tablename__ = "visit_returns"

    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(String, ForeignKey("visits.id"))
    product_id = Column(String)
    name = Column(String)
    quantity = Column(Integer)

    visit = relationship("Visit", back_populates="returns")
