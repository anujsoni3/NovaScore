# ========================================================================================
# NOVASCORE FINANCIAL ASSESSMENT PLATFORM - FLASK BACKEND WITH ML MODEL
# ========================================================================================
# Flask backend for partner creditworthiness assessment system using trained ML model
# ========================================================================================

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.exceptions import BadRequest
import pandas as pd
import numpy as np
import sqlite3
import json
import io
import pickle
import joblib
from datetime import datetime, timedelta
import uuid
import logging
from typing import Optional, List, Dict, Any
from typing import Dict, Any, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage
import json
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Add CORS support
CORS(app, origins=["*"])  # In production, specify exact origins

# ========================================================================================
# MODEL LOADING
# ========================================================================================

class MLModelLoader:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.encoder = None
        self.model_info = None
        self.load_models()
    
    def load_models(self):
        """Load all required ML artifacts"""
        try:
            # Load the trained model
            with open('best_nova_score_model.pkl', 'rb') as f:
                self.model = pickle.load(f)
            logger.info("Model loaded successfully")
            
            # Load feature scaler
            with open('feature_scaler.pkl', 'rb') as f:
                self.scaler = pickle.load(f)
            logger.info("Feature scaler loaded successfully")
            
            # Load partner type encoder
            with open('partner_type_encoder.pkl', 'rb') as f:
                self.encoder = pickle.load(f)
            logger.info("Partner type encoder loaded successfully")
            
            # Load model info
            with open('model_info.json', 'r') as f:
                self.model_info = json.load(f)
            logger.info("Model info loaded successfully")
            
            logger.info(f"Using {self.model_info['best_model_name']} model with features: {len(self.model_info['feature_names'])}")
            
        except Exception as e:
            logger.error(f"Error loading ML models: {str(e)}")
            raise Exception(f"Failed to load ML models: {str(e)}")

# Initialize ML model loader
try:
    ml_loader = MLModelLoader()
    logger.info("ML models loaded successfully")
except Exception as e:
    logger.error(f"Failed to initialize ML models: {str(e)}")
    raise

# ========================================================================================
# DATABASE SETUP
# ========================================================================================

def init_database():
    """Initialize SQLite database"""
    conn = sqlite3.connect('novascore.db')
    cursor = conn.cursor()
    
    # Create assessments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS assessments (
            id TEXT PRIMARY KEY,
            partner_type TEXT NOT NULL,
            partner_name TEXT,
            monthly_earning INTEGER,
            yearly_earning INTEGER,
            customer_rating REAL,
            active_days INTEGER,
            working_tenure_ingrab INTEGER,
            nova_score REAL,
            loan_approved BOOLEAN,
            loan_amount INTEGER,
            interest_rate REAL,
            risk_category TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            additional_data TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database
init_database()

# ========================================================================================
# FEATURE ENGINEERING
# ========================================================================================

class FeatureEngineer:
    @staticmethod
    def calculate_derived_features(data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate derived features as per model training"""
        features = data.copy()
        
        # Basic calculations with safe division
        monthly_earning = features.get('monthly_earning', 0)
        yearly_earning = features.get('yearly_earning', 0)
        active_days = max(features.get('active_days', 1), 1)  # Avoid division by zero
        working_tenure_ingrab = max(features.get('working_tenure_ingrab', 1), 1)
        
        # Earnings consistency
        expected_yearly = monthly_earning * 12
        features['earning_consistency'] = yearly_earning / max(expected_yearly, 1) if expected_yearly > 0 else 0
        
        # Earnings per active day
        features['earnings_per_active_day'] = monthly_earning / active_days
        
        # Earning consistency ratio
        features['earning_consistency_ratio'] = min(features['earning_consistency'], 1.0)
        
        # Activity per tenure (months)
        features['activity_per_tenure'] = active_days / working_tenure_ingrab
        
        # Total negative rate
        cancellation_rate = features.get('cancellation_rate', 0)
        complaint_rate = features.get('complaint_rate', 0)
        features['total_negative_rate'] = cancellation_rate + complaint_rate
        
        # Rating to complaint ratio
        customer_rating = features.get('customer_rating', 5.0)
        features['rating_to_complaint_ratio'] = customer_rating / max(complaint_rate, 0.001)
        
        # Partner-specific features
        if features.get('partner_type') == 'driver':
            total_trips = features.get('total_trips', 0)
            features['trips_per_active_day'] = total_trips / active_days
            features['earning_per_trip'] = monthly_earning / max(total_trips, 1)
            
        elif features.get('partner_type') == 'merchant':
            total_orders = features.get('total_orders', 0)
            features['orders_per_active_day'] = total_orders / active_days
            features['earning_per_order'] = monthly_earning / max(total_orders, 1)
            
        elif features.get('partner_type') == 'delivery_partner':
            total_deliveries = features.get('total_deliveries', 0)
            features['deliveries_per_active_day'] = total_deliveries / active_days
            features['earning_per_delivery'] = monthly_earning / max(total_deliveries, 1)
        
        return features
    
    @staticmethod
    def prepare_features_for_prediction(data: Dict[str, Any], feature_names: List[str]) -> np.ndarray:
        """Prepare features in the exact order expected by the model"""
        
        # Calculate derived features
        enriched_data = FeatureEngineer.calculate_derived_features(data)
        
        # Encode partner type
        partner_type = enriched_data.get('partner_type', 'driver')
        try:
            partner_type_encoded = ml_loader.encoder.transform([partner_type])[0]
        except:
            partner_type_encoded = 0  # Default encoding
        enriched_data['partner_type_encoded'] = partner_type_encoded
        
        # Create feature vector in exact model order
        feature_vector = []
        for feature_name in feature_names:
            if feature_name in enriched_data:
                feature_vector.append(enriched_data[feature_name])
            else:
                # Set default values for missing features
                default_values = {
                    'earning_consistency': 0.8,
                    'monthly_earning': 0,
                    'yearly_earning': 0,
                    'customer_rating': 5.0,
                    'active_days': 15,
                    'cancellation_rate': 0.05,
                    'complaint_rate': 0.03,
                    'working_tenure_ingrab': 6,
                    'total_trips': 0,
                    'vehicle_age': 3,
                    'trip_distance': 10,
                    'peak_hours_ratio': 0.3,
                    'total_orders': 0,
                    'avg_ordervalue': 200,
                    'preparation_time': 15,
                    'menu_diversity': 20,
                    'consumer_retention_rate': 0.7,
                    'total_deliveries': 0,
                    'avg_delivery_time': 25,
                    'delivery_success_rate': 0.95,
                    'batch_delivery_ratio': 0.2,
                    'partner_type_encoded': 0,
                    'earnings_per_active_day': 200,
                    'earning_consistency_ratio': 0.8,
                    'activity_per_tenure': 2.5,
                    'total_negative_rate': 0.08,
                    'rating_to_complaint_ratio': 100,
                    'trips_per_active_day': 8,
                    'earning_per_trip': 25,
                    'orders_per_active_day': 10,
                    'earning_per_order': 20,
                    'deliveries_per_active_day': 12,
                    'earning_per_delivery': 18
                }
                feature_vector.append(default_values.get(feature_name, 0))
        
        return np.array(feature_vector).reshape(1, -1)

# ========================================================================================
# VALIDATION FUNCTIONS
# ========================================================================================

def validate_partner_data(partner_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate partner data based on type"""
    errors = []
    
    # Common validations
    if 'customer_rating' in data:
        if not isinstance(data['customer_rating'], (int, float)) or not (1.0 <= data['customer_rating'] <= 5.0):
            errors.append('Customer rating must be between 1.0 and 5.0')
    
    if 'active_days' in data:
        if not isinstance(data['active_days'], int) or not (0 <= data['active_days'] <= 31):
            errors.append('Active days must be between 0 and 31')
    
    # Partner-specific validations
    if partner_type == 'driver':
        if 'peak_hours_ratio' in data:
            if not isinstance(data['peak_hours_ratio'], (int, float)) or not (0.0 <= data['peak_hours_ratio'] <= 1.0):
                errors.append('Peak hours ratio must be between 0.0 and 1.0')
                
    elif partner_type == 'merchant':
        if 'consumer_retention_rate' in data:
            if not isinstance(data['consumer_retention_rate'], (int, float)) or not (0.0 <= data['consumer_retention_rate'] <= 1.0):
                errors.append('Consumer retention rate must be between 0.0 and 1.0')
                
    elif partner_type == 'delivery_partner':
        if 'delivery_success_rate' in data:
            if not isinstance(data['delivery_success_rate'], (int, float)) or not (0.0 <= data['delivery_success_rate'] <= 1.0):
                errors.append('Delivery success rate must be between 0.0 and 1.0')
        if 'batch_delivery_ratio' in data:
            if not isinstance(data['batch_delivery_ratio'], (int, float)) or not (0.0 <= data['batch_delivery_ratio'] <= 1.0):
                errors.append('Batch delivery ratio must be between 0.0 and 1.0')
    
    if errors:
        raise ValueError('; '.join(errors))
    
    return data

def validate_partner_type(partner_type: str) -> bool:
    """Validate partner type"""
    return partner_type in ['driver', 'merchant', 'delivery_partner']

# ========================================================================================
# ML-POWERED NOVA SCORE CALCULATION ENGINE
# ========================================================================================

class MLNovaScoreCalculator:
    
    @staticmethod
    def predict_nova_score(partner_type: str, data: Dict[str, Any]) -> float:
        """Predict Nova Score using trained ML model"""
        try:
            # Prepare features for prediction
            feature_vector = FeatureEngineer.prepare_features_for_prediction(
                data, ml_loader.model_info['feature_names']
            )
            
            # Scale features
            feature_vector_scaled = ml_loader.scaler.transform(feature_vector)
            
            # Make prediction
            prediction = ml_loader.model.predict(feature_vector_scaled)[0]
            
            # Ensure score is within valid range [0, 100]
            nova_score = max(0, min(100, float(prediction)))
            
            logger.info(f"ML Model predicted Nova Score: {nova_score}")
            return round(nova_score, 2)
            
        except Exception as e:
            logger.error(f"ML prediction error: {str(e)}")
            raise Exception(f"Failed to predict Nova Score: {str(e)}")
    
    @staticmethod
    def get_risk_category(nova_score: float) -> str:
        """Get risk category based on Nova Score"""
        if nova_score >= 80:
            return "Excellent"
        elif nova_score >= 65:
            return "Good"
        elif nova_score >= 50:
            return "Fair"
        else:
            return "Poor"
    
    @staticmethod
    def make_loan_decision(nova_score: float, monthly_earning: int, tenure_months: int) -> Dict[str, Any]:
        """Make loan decision based on Nova Score and business rules"""
        
        # Business rules
        min_score = 45
        min_earning = 1000
        min_tenure = 3
        
        # Check eligibility
        eligible = (nova_score >= min_score and 
                   monthly_earning >= min_earning and 
                   tenure_months >= min_tenure)
        
        if not eligible:
            return {
                'approved': False,
                'reason': f'Does not meet minimum criteria (Score: {min_score}+, Earning: ₹{min_earning}+, Tenure: {min_tenure}+ months)',
                'max_amount': 0,
                'interest_rate': 0,
                'tenure_months': 0
            }
        
        # Calculate loan terms based on Nova Score
        if nova_score >= 80:
            max_amount = monthly_earning * 40
            interest_rate = 10.5
            tenure_months_offered = 36
        elif nova_score >= 65:
            max_amount = monthly_earning * 30
            interest_rate = 12.5
            tenure_months_offered = 24
        elif nova_score >= 50:
            max_amount = monthly_earning * 20
            interest_rate = 15.0
            tenure_months_offered = 18
        else:
            max_amount = monthly_earning * 15
            interest_rate = 18.0
            tenure_months_offered = 12
        
        # Cap maximum loan amount
        max_amount = min(max_amount, 500000)
        
        return {
            'approved': True,
            'max_amount': int(max_amount),
            'interest_rate': interest_rate,
            'tenure_months': tenure_months_offered,
            'monthly_emi': int((max_amount * (interest_rate/100/12) * (1 + interest_rate/100/12)**tenure_months_offered) / 
                              ((1 + interest_rate/100/12)**tenure_months_offered - 1))
        }
    
    @staticmethod
    def get_recommendations(nova_score: float, data: Dict[str, Any], google_api_key: str = None) -> List[str]:
        """Generate improvement recommendations using Google Gemini 1.5 Flash"""
        
        try:
            # Use provided API key or environment variable
            api_key = "AIzaSyARfWELnfMb0lHPkjIiLGN1EvseNkVlrRU"
            
            if not api_key:
                raise ValueError("Google API key not provided. Pass it as parameter or set GOOGLE_API_KEY environment variable.")
            
            # Initialize Gemini 1.5 Flash model
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=api_key,
                temperature=0.3,
                max_tokens=1000
            )
            
            # Prepare the prompt with user data
            prompt = f"""
            You are an expert performance analyst for gig economy workers. Based on the following performance data, 
            generate exactly 5 personalized improvement recommendations.
            
            Performance Data:
            - NOVA Score: {nova_score}/100 (ML Model Predicted)
            - Monthly Earning: ${data.get('monthly_earning', 0)}
            - Customer Rating: {data.get('customer_rating', 5.0)}/5.0
            - Active Days: {data.get('active_days', 30)} days
            - Complaint Rate: {data.get('complaint_rate', 0):.2%}
            - Cancellation Rate: {data.get('cancellation_rate', 0):.2%}
            - Total Trips/Orders: {data.get('total_trips', 0)}
            - Working Tenure: {data.get('working_tenure_ingrab', 0)} months
            
            Guidelines:
            1. Be specific and actionable
            2. Use appropriate emojis
            3. Prioritize most impactful improvements
            4. Consider NOVA score level (80+: premium focus, 65-79: incremental, 50-64: major gaps, <50: fundamentals)
            5. One concise sentence per recommendation
            
            Return exactly 5 recommendations in JSON format:
            {{"recommendations": ["rec1", "rec2", "rec3", "rec4", "rec5"]}}
            """
            
            # Generate recommendations using Gemini
            message = HumanMessage(content=prompt)
            response = llm([message])
            
            # Parse JSON response
            response_data = json.loads(response.content.strip())
            recommendations = response_data.get('recommendations', [])
            
            # Ensure exactly 5 recommendations
            if len(recommendations) >= 5:
                return recommendations[:5]
            
        except Exception as e:
            logger.error(f"AI recommendation error: {e}")
            raise Exception(f"Failed to generate recommendations: {str(e)}")

# ========================================================================================
# DATABASE OPERATIONS
# ========================================================================================

def save_assessment(assessment_data: Dict[str, Any]) -> str:
    """Save assessment to database"""
    conn = sqlite3.connect('novascore.db')
    cursor = conn.cursor()
    
    assessment_id = str(uuid.uuid4())
    
    cursor.execute('''
        INSERT INTO assessments (
            id, partner_type, partner_name, monthly_earning, yearly_earning,
            customer_rating, active_days, working_tenure_ingrab, nova_score,
            loan_approved, loan_amount, interest_rate, risk_category, additional_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        assessment_id,
        assessment_data['partner_type'],
        assessment_data['partner_name'],
        assessment_data['monthly_earning'],
        assessment_data['yearly_earning'],
        assessment_data['customer_rating'],
        assessment_data['active_days'],
        assessment_data['working_tenure_ingrab'],
        assessment_data['nova_score'],
        assessment_data['loan_approved'],
        assessment_data['loan_amount'],
        assessment_data['interest_rate'],
        assessment_data['risk_category'],
        json.dumps(assessment_data.get('additional_data', {}))
    ))
    
    conn.commit()
    conn.close()
    
    return assessment_id

def get_assessment_history(limit: int = 100) -> List[Dict[str, Any]]:
    """Get assessment history from database"""
    conn = sqlite3.connect('novascore.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM assessments 
        ORDER BY created_at DESC 
        LIMIT ?
    ''', (limit,))
    
    columns = [description[0] for description in cursor.description]
    results = [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    conn.close()
    return results

def get_dashboard_stats() -> Dict[str, Any]:
    """Get dashboard statistics"""
    conn = sqlite3.connect('novascore.db')
    cursor = conn.cursor()
    
    # Total assessments
    cursor.execute('SELECT COUNT(*) FROM assessments')
    total_assessments = cursor.fetchone()[0]
    
    # Approval rate
    cursor.execute('SELECT COUNT(*) FROM assessments WHERE loan_approved = 1')
    approved_count = cursor.fetchone()[0]
    approval_rate = (approved_count / max(total_assessments, 1)) * 100
    
    # Average Nova Score
    cursor.execute('SELECT AVG(nova_score) FROM assessments')
    avg_nova_score = cursor.fetchone()[0] or 0
    
    # Risk distribution
    cursor.execute('''
        SELECT risk_category, COUNT(*) 
        FROM assessments 
        GROUP BY risk_category
    ''')
    risk_distribution = dict(cursor.fetchall())
    
    # Partner type distribution
    cursor.execute('''
        SELECT partner_type, COUNT(*) 
        FROM assessments 
        GROUP BY partner_type
    ''')
    partner_distribution = dict(cursor.fetchall())
    
    # Recent assessments trend (last 7 days)
    cursor.execute('''
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM assessments 
        WHERE created_at >= datetime('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY date
    ''')
    daily_assessments = [{'date': row[0], 'count': row[1]} for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        'total_assessments': total_assessments,
        'approval_rate': round(approval_rate, 2),
        'avg_nova_score': round(avg_nova_score, 2),
        'risk_distribution': risk_distribution,
        'partner_distribution': partner_distribution,
        'daily_assessments': daily_assessments,
        'model_info': {
            'model_name': ml_loader.model_info['best_model_name'],
            'features_count': len(ml_loader.model_info['feature_names'])
        }
    }

# ========================================================================================
# ERROR HANDLERS
# ========================================================================================

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request', 'message': str(error)}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found', 'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error', 'message': 'An unexpected error occurred'}), 500

# ========================================================================================
# API ROUTES
# ========================================================================================

@app.route("/", methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        "message": "NovaScore Financial Assessment Platform API - ML Powered",
        "version": "2.0.0",
        "status": "active",
        "model": ml_loader.model_info['best_model_name'],
        "features": len(ml_loader.model_info['feature_names'])
    })

@app.route("/api/partner-types", methods=['GET'])
def get_partner_types():
    """Get available partner types"""
    return jsonify({
        "partner_types": [
            {
                "id": "driver",
                "name": "Driver",
                "description": "Vehicle drivers for ride-sharing services",
                "required_fields": ["total_trips", "vehicle_age", "trip_distance", "peak_hours_ratio"]
            },
            {
                "id": "merchant",
                "name": "Merchant",
                "description": "Restaurant and store partners",
                "required_fields": ["total_orders", "avg_ordervalue", "preparation_time", "menu_diversity", "consumer_retention_rate"]
            },
            {
                "id": "delivery_partner",
                "name": "Delivery Partner",
                "description": "Food and package delivery partners",
                "required_fields": ["total_deliveries", "avg_delivery_time", "delivery_success_rate", "batch_delivery_ratio"]
            }
        ]
    })

@app.route("/api/assess-partner", methods=['POST'])
def assess_partner():
    """Assess a single partner using ML model"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        partner_type = data.get('partner_type')
        partner_data = data.get('partner_data', {})
        
        if not partner_type:
            return jsonify({'error': 'Partner type is required'}), 400
        
        if not validate_partner_type(partner_type):
            return jsonify({'error': 'Invalid partner type. Must be driver, merchant, or delivery_partner'}), 400
        
        # Validate partner data
        validate_partner_data(partner_type, partner_data)
        
        # Add partner type to data for feature engineering
        partner_data['partner_type'] = partner_type
        
        # Calculate Nova Score using ML model
        calculator = MLNovaScoreCalculator()
        nova_score = calculator.predict_nova_score(partner_type, partner_data)
        
        # Get risk category
        risk_category = calculator.get_risk_category(nova_score)
        
        # Make loan decision
        loan_decision = calculator.make_loan_decision(
            nova_score, 
            partner_data.get('monthly_earning', 0),
            partner_data.get('working_tenure_ingrab', 0)
        )
        
        # Get recommendations
        recommendations = calculator.get_recommendations(nova_score, partner_data)
        
        # Save to database
        assessment_data = {
            'partner_type': partner_type,
            'partner_name': partner_data.get('partner_name', 'Partner'),
            'monthly_earning': partner_data.get('monthly_earning', 0),
            'yearly_earning': partner_data.get('yearly_earning', 0),
            'customer_rating': partner_data.get('customer_rating', 0),
            'active_days': partner_data.get('active_days', 0),
            'working_tenure_ingrab': partner_data.get('working_tenure_ingrab', 0),
            'nova_score': nova_score,
            'loan_approved': loan_decision['approved'],
            'loan_amount': loan_decision.get('max_amount', 0),
            'interest_rate': loan_decision.get('interest_rate', 0),
            'risk_category': risk_category,
            'additional_data': partner_data
        }
        
        assessment_id = save_assessment(assessment_data)
        
        return jsonify({
            'assessment_id': assessment_id,
            'partner_type': partner_type,
            'partner_name': partner_data.get('partner_name', 'Partner'),
            'nova_score': nova_score,
            'risk_category': risk_category,
            'loan_decision': loan_decision,
            'recommendations': recommendations,
            'model_used': ml_loader.model_info['best_model_name'],
            'timestamp': datetime.now().isoformat()
        })
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Assessment error: {str(e)}")
        return jsonify({'error': 'Assessment failed', 'message': str(e)}), 500

@app.route("/api/batch-assess", methods=['POST'])
def batch_assess():
    """Batch assess multiple partners from CSV using ML model"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'File must be a CSV'}), 400
        
        # Read CSV file
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        df = pd.read_csv(stream)
        
        results = []
        calculator = MLNovaScoreCalculator()
        
        for _, row in df.iterrows():
            try:
                data = row.to_dict()
                partner_type = data.get('partner_type', 'driver')
                
                # Skip rows with missing essential data
                if pd.isna(data.get('monthly_earning')) or pd.isna(data.get('customer_rating')):
                    continue
                
                # Add partner type to data
                data['partner_type'] = partner_type
                
                # Calculate assessment using ML model
                nova_score = calculator.predict_nova_score(partner_type, data)
                risk_category = calculator.get_risk_category(nova_score)
                loan_decision = calculator.make_loan_decision(
                    nova_score,
                    data.get('monthly_earning', 0),
                    data.get('working_tenure_ingrab', 0)
                )
                
                # Save to database
                assessment_data = {
                    'partner_type': partner_type,
                    'partner_name': data.get('partner_name', f'Partner_{len(results)+1}'),
                    'monthly_earning': data.get('monthly_earning', 0),
                    'yearly_earning': data.get('yearly_earning', 0),
                    'customer_rating': data.get('customer_rating', 0),
                    'active_days': data.get('active_days', 0),
                    'working_tenure_ingrab': data.get('working_tenure_ingrab', 0),
                    'nova_score': nova_score,
                    'loan_approved': loan_decision['approved'],
                    'loan_amount': loan_decision.get('max_amount', 0),
                    'interest_rate': loan_decision.get('interest_rate', 0),
                    'risk_category': risk_category,
                    'additional_data': data
                }
                
                assessment_id = save_assessment(assessment_data)
                
                results.append({
                    'assessment_id': assessment_id,
                    'partner_name': data.get('partner_name', f'Partner_{len(results)+1}'),
                    'nova_score': nova_score,
                    'risk_category': risk_category,
                    'loan_approved': loan_decision['approved'],
                    'loan_amount': loan_decision.get('max_amount', 0)
                })
                
            except Exception as e:
                logger.error(f"Row processing error: {str(e)}")
                continue
        
        return jsonify({
            'message': f'Processed {len(results)} assessments successfully using ML model',
            'results': results,
            'total_processed': len(results),
            'total_rows': len(df),
            'model_used': ml_loader.model_info['best_model_name']
        })
        
    except Exception as e:
        logger.error(f"Batch assessment error: {str(e)}")
        return jsonify({'error': 'Batch assessment failed', 'message': str(e)}), 500

@app.route("/api/model-info", methods=['GET'])
def get_model_info():
    """Get ML model information"""
    try:
        return jsonify({
            'model_name': ml_loader.model_info['best_model_name'],
            'model_params': ml_loader.model_info['model_params'],
            'feature_count': len(ml_loader.model_info['feature_names']),
            'feature_names': ml_loader.model_info['feature_names'],
            'status': 'loaded'
        })
    except Exception as e:
        logger.error(f"Model info retrieval error: {str(e)}")
        return jsonify({'error': 'Failed to retrieve model info', 'message': str(e)}), 500

@app.route("/api/feature-importance", methods=['POST'])
def get_feature_importance():
    """Get feature importance for a specific prediction"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        partner_type = data.get('partner_type')
        partner_data = data.get('partner_data', {})
        
        if not partner_type or not partner_data:
            return jsonify({'error': 'Partner type and data are required'}), 400
        
        # Add partner type to data
        partner_data['partner_type'] = partner_type
        
        # Prepare features
        feature_vector = FeatureEngineer.prepare_features_for_prediction(
            partner_data, ml_loader.model_info['feature_names']
        )
        
        # Get feature names and values
        feature_names = ml_loader.model_info['feature_names']
        feature_values = feature_vector[0].tolist()
        
        # Create feature importance data (values as proxy for importance)
        feature_importance = []
        for i, (name, value) in enumerate(zip(feature_names, feature_values)):
            feature_importance.append({
                'feature': name,
                'value': round(float(value), 4),
                'normalized_value': round(float(value) / max(abs(max(feature_values)), abs(min(feature_values)), 1), 4)
            })
        
        # Sort by absolute normalized value (descending)
        feature_importance.sort(key=lambda x: abs(x['normalized_value']), reverse=True)
        
        return jsonify({
            'feature_importance': feature_importance[:15],  # Top 15 features
            'total_features': len(feature_names),
            'partner_type': partner_type
        })
        
    except Exception as e:
        logger.error(f"Feature importance error: {str(e)}")
        return jsonify({'error': 'Failed to calculate feature importance', 'message': str(e)}), 500

@app.route("/api/assessment-history", methods=['GET'])
def get_history():
    """Get assessment history"""
    try:
        limit = request.args.get('limit', 100, type=int)
        history = get_assessment_history(limit)
        return jsonify({
            'assessments': history,
            'total': len(history)
        })
    except Exception as e:
        logger.error(f"History retrieval error: {str(e)}")
        return jsonify({'error': 'Failed to retrieve history', 'message': str(e)}), 500

@app.route("/api/dashboard-stats", methods=['GET'])
def get_stats():
    """Get dashboard statistics"""
    try:
        stats = get_dashboard_stats()
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Stats retrieval error: {str(e)}")
        return jsonify({'error': 'Failed to retrieve stats', 'message': str(e)}), 500

@app.route("/api/predict-score-only", methods=['POST'])
def predict_score_only():
    """Get only the Nova Score prediction without saving to database"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        partner_type = data.get('partner_type')
        partner_data = data.get('partner_data', {})
        
        if not partner_type:
            return jsonify({'error': 'Partner type is required'}), 400
        
        if not validate_partner_type(partner_type):
            return jsonify({'error': 'Invalid partner type. Must be driver, merchant, or delivery_partner'}), 400
        
        # Add partner type to data
        partner_data['partner_type'] = partner_type
        
        # Validate partner data
        validate_partner_data(partner_type, partner_data)
        
        # Calculate Nova Score using ML model
        calculator = MLNovaScoreCalculator()
        nova_score = calculator.predict_nova_score(partner_type, partner_data)
        
        # Get risk category
        risk_category = calculator.get_risk_category(nova_score)
        
        return jsonify({
            'partner_type': partner_type,
            'nova_score': nova_score,
            'risk_category': risk_category,
            'model_used': ml_loader.model_info['best_model_name'],
            'timestamp': datetime.now().isoformat()
        })
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'error': 'Prediction failed', 'message': str(e)}), 500

@app.route("/api/health", methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test model prediction with dummy data
        test_data = {
            'partner_type': 'driver',
            'monthly_earning': 3000,
            'yearly_earning': 36000,
            'customer_rating': 4.2,
            'active_days': 25,
            'working_tenure_ingrab': 12,
            'total_trips': 200,
            'vehicle_age': 2,
            'trip_distance': 8.5,
            'peak_hours_ratio': 0.4
        }
        
        calculator = MLNovaScoreCalculator()
        test_score = calculator.predict_nova_score('driver', test_data)
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "2.0.0",
            "model_status": "operational",
            "model_name": ml_loader.model_info['best_model_name'],
            "test_prediction": test_score
        })
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "version": "2.0.0",
            "error": str(e)
        }), 500

@app.route("/api/validate-features", methods=['POST'])
def validate_features():
    """Validate if provided features are sufficient for prediction"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        partner_type = data.get('partner_type')
        partner_data = data.get('partner_data', {})
        
        if not partner_type:
            return jsonify({'error': 'Partner type is required'}), 400
        
        # Check required features
        required_common = ['monthly_earning', 'customer_rating', 'active_days', 'working_tenure_ingrab']
        
        partner_specific_required = {
            'driver': ['total_trips'],
            'merchant': ['total_orders'],
            'delivery_partner': ['total_deliveries']
        }
        
        missing_features = []
        for feature in required_common:
            if feature not in partner_data or partner_data[feature] is None:
                missing_features.append(feature)
        
        if partner_type in partner_specific_required:
            for feature in partner_specific_required[partner_type]:
                if feature not in partner_data or partner_data[feature] is None:
                    missing_features.append(feature)
        
        # Get all expected features
        expected_features = ml_loader.model_info['feature_names']
        provided_features = list(partner_data.keys())
        
        return jsonify({
            'valid': len(missing_features) == 0,
            'missing_required_features': missing_features,
            'provided_features': provided_features,
            'expected_model_features': expected_features,
            'coverage_percentage': round((len(provided_features) / len(expected_features)) * 100, 2)
        })
        
    except Exception as e:
        logger.error(f"Feature validation error: {str(e)}")
        return jsonify({'error': 'Feature validation failed', 'message': str(e)}), 500

# ========================================================================================
# APPLICATION STARTUP
# ========================================================================================

if __name__ == "__main__":
    logger.info("Starting NovaScore Financial Assessment Platform - ML Powered (Flask)")
    
    # Verify ML models are loaded
    if not ml_loader.model or not ml_loader.scaler or not ml_loader.encoder:
        logger.error("ML models not loaded properly. Application cannot start.")
        raise Exception("ML models not loaded")
    
    init_database()
    logger.info("Database initialized successfully")
    logger.info(f"Using {ml_loader.model_info['best_model_name']} model with {len(ml_loader.model_info['feature_names'])} features")
    
    app.run(host="0.0.0.0", port=8000, debug=True)
    