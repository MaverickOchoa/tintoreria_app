import os
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt
from werkzeug.utils import secure_filename
from flask_restful import Resource

from app import db
from models.clinical_form import ClinicalForm

# Helper to ensure upload directory exists
def ensure_upload_dir(business_id):
    upload_root = os.path.join(current_app.root_path, 'uploads', 'clinical_records')
    business_dir = os.path.join(upload_root, str(business_id))
    os.makedirs(business_dir, exist_ok=True)
    return business_dir

class ClinicalRecordUploadResource(Resource):
    @jwt_required()
    def post(self):
        claims = get_jwt()
        business_id = claims.get('business_id')
        if not business_id:
            return {'message': 'Business not found in token'}, 403
        if 'file' not in request.files:
            return {'message': 'No file part'}, 400
        file = request.files['file']
        if file.filename == '':
            return {'message': 'No selected file'}, 400
        # Validate MIME type
        if file.mimetype != 'application/pdf':
            return {'message': 'Only PDF files are allowed'}, 400
        filename = secure_filename(file.filename)
        upload_dir = ensure_upload_dir(business_id)
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        # Record in DB
        form = ClinicalForm(
            business_id=business_id,
            name=filename,
            description='Clinical form uploaded via UI',
            pdf_url=os.path.relpath(file_path, current_app.root_path).replace('\\', '/'),
            version=1,
            created_at=datetime.utcnow()
        )
        db.session.add(form)
        db.session.commit()
        return {'success': True, 'record': form.to_dict()}, 201

class ClinicalRecordListResource(Resource):
    @jwt_required()
    def get(self):
        claims = get_jwt()
        business_id = claims.get('business_id')
        if not business_id:
            return {'message': 'Business not found in token'}, 403
        records = ClinicalForm.query.filter_by(business_id=business_id).all()
        return {'records': [r.to_dict() for r in records]}, 200

class ClinicalRecordDownloadResource(Resource):
    @jwt_required()
    def get(self, record_id):
        claims = get_jwt()
        business_id = claims.get('business_id')
        record = ClinicalForm.query.filter_by(id=record_id, business_id=business_id).first_or_404()
        if not record.pdf_url:
            return {'message': 'No PDF attached'}, 404
        directory, filename = os.path.split(os.path.join(current_app.root_path, record.pdf_url))
        return send_from_directory(directory, filename, as_attachment=True)

