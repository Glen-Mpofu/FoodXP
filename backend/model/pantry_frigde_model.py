import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress most TensorFlow logs
import logging
logging.getLogger("tensorflow").setLevel(logging.ERROR)  # Extra safety

from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from flask import Flask, request, jsonify
import numpy as np
import sys
import json
import base64, io
from PIL import Image

model = load_model(r"C:\Projects Programming\Wil Project\FoodXP\backend\model\fridge_pantry_model.keras")
class_labels = ['fridge', 'pantry']

def classify(imageUri):  
    img = image.load_img(imageUri, target_size=(224, 224))
    img_array = np.expand_dims(image.img_to_array(img) / 255.0, axis=0)
    predictions = model.predict(img_array, verbose=0)  # <-- suppress progress logs
    predicted_index = np.argmax(predictions[0])
    confidence = float(predictions[0][predicted_index])
    return {"Prediction": class_labels[predicted_index], "Confidence": confidence}

# --- flask setup ---
app = Flask(__name__)

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        photo = data.get("photo")
        if not photo:
            return jsonify({"error": "No image provided"}), 400
        
        # Decode base64 to temp image
        if "," in photo:
            photo = photo.split(",")[1]
        img_bytes = base64.b64decode(photo)
        temp_path = "temp_image.jpg"
        with open(temp_path, "wb") as f:
            f.write(img_bytes)

        # classifying the food in the image
        result = classify(temp_path)
        # deleting the temp image after classification
        os.remove(temp_path)
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="192.168.101.103", port=5002, threaded = True)
 