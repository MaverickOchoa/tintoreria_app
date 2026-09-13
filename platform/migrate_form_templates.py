"""
Run once in Render shell to create form_templates table and
add missing columns to clinical_form_entries.

  python migrate_form_templates.py
"""
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)

SQL = """
-- Create form_templates if it doesn't exist
CREATE TABLE IF NOT EXISTS form_templates (
    id          SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id),
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    pdf_url     TEXT NOT NULL,
    pages_urls  TEXT NOT NULL DEFAULT '[]',
    field_map   TEXT NOT NULL DEFAULT '[]',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_form_templates_business_id ON form_templates(business_id);

-- Add columns to clinical_form_entries if missing
ALTER TABLE clinical_form_entries
    ADD COLUMN IF NOT EXISTS template_id    INTEGER REFERENCES form_templates(id),
    ADD COLUMN IF NOT EXISTS filled_pdf_url TEXT;
CREATE INDEX IF NOT EXISTS ix_cfe_template_id ON clinical_form_entries(template_id);
"""

with engine.connect() as conn:
    conn.execute(text(SQL))
    conn.commit()

print("Migration completed successfully.")
