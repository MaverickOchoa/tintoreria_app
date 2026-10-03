from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String

Base = declarative_base()

class Order(Base):
    __tablename__ = 'orders'
    id = Column(Integer, primary_key=True)
    status = Column(String)

print("notin_:", Order.status.notin_(['a', 'b']))
print("not_in:", Order.status.not_in(['a', 'b']))
