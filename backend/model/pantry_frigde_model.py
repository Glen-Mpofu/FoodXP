import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress most TensorFlow logs
import logging
logging.getLogger("tensorflow").setLevel(logging.ERROR)  # Extra safety

from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import numpy as np
import sys
import json

model = load_model(r"C:\Users\Reception\OneDrive - Tshwane University of Technology\Desktop\Tshepo\React Course\FoodXP\backend\model\fridge_pantry_model.keras")
class_labels = ['fridge', 'pantry']

def classify(imageUri):  
    img = image.load_img(imageUri, target_size=(224, 224))
    img_array = np.expand_dims(image.img_to_array(img) / 255.0, axis=0)
    predictions = model.predict(img_array, verbose=0)  # <-- suppress progress logs
    predicted_index = np.argmax(predictions[0])
    confidence = float(predictions[0][predicted_index])
    return {"Prediction": class_labels[predicted_index], "Confidence": confidence}

if __name__ == "__main__":
    img_path = sys.argv[1]
    result = classify(img_path)
    print(json.dumps(result))
