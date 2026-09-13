"""Add cost_per_point to branches and cost_points to items."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from app import app, db

def run():
    with app.app_context():
        with db.engine.connect() as conn:
            # branches.cost_per_point
            try:
                conn.execute(db.text(
                    "ALTER TABLE branches ADD COLUMN cost_per_point FLOAT"
                ))
                conn.commit()
                print("OK: branches.cost_per_point added")
            except Exception as e:
                print(f"branches.cost_per_point: {e}")

            # items.cost_points
            try:
                conn.execute(db.text(
                    "ALTER TABLE items ADD COLUMN cost_points FLOAT DEFAULT 1.0"
                ))
                conn.commit()
                print("OK: items.cost_points added")
            except Exception as e:
                print(f"items.cost_points: {e}")

if __name__ == "__main__":
    run()
