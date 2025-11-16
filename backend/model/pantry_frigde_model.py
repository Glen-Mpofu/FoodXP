import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress most TensorFlow logs
import logging
logging.getLogger("tensorflow").setLevel(logging.ERROR)  # Extra safety

import gdown
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from flask import Flask, request, jsonify
import numpy as np
import base64

# -------------------------------
# Model download & load
# -------------------------------
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "fridge_pantry_model.keras")
GDRIVE_URL = "https://drive.google.com/uc?id=1_v0cDZZelvsT9SPx-UK5PSbC-DyAJKQu"

# Download the model if it doesn't exist
if not os.path.exists(MODEL_PATH):
    print("Downloading model from Google Drive...")
    gdown.download(GDRIVE_URL, MODEL_PATH, quiet=False)

# Load the model
model = load_model(MODEL_PATH)
print("Model loaded successfully!")

class_labels = ['fridge', 'pantry']

# -------------------------------
# Image classification function
# -------------------------------
def classify(imageUri):  
    img = image.load_img(imageUri, target_size=(224, 224))
    img_array = np.expand_dims(image.img_to_array(img) / 255.0, axis=0)
    predictions = model.predict(img_array, verbose=0)
    predicted_index = np.argmax(predictions[0])
    confidence = float(predictions[0][predicted_index])
    return {"Prediction": class_labels[predicted_index], "Confidence": confidence}

# -------------------------------
# Flask app setup
# -------------------------------
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

        # Classify the image
        result = classify(temp_path)

        # Delete temp image
        os.remove(temp_path)
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Run server (cloud-ready)
# -------------------------------

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, threaded=True)
# --    
# if __name__ == "__main__": 
#    app.run(host="192.168.101.103", port=5002, threaded = True)
# ---