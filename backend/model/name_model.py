import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # suppress TensorFlow logs
import logging
logging.getLogger("tensorflow").setLevel(logging.ERROR)

import numpy as np
from PIL import Image
import tensorflow as tf

# ----- CONFIG -----
MODEL_PATH = r"C:\Users\Reception\OneDrive - Tshwane University of Technology\Desktop\Tshepo\React Course\FoodXP\backend\model\1.tflite"
IMAGE_PATH = r"C:\Users\Reception\OneDrive - Tshwane University of Technology\Pictures\model\fridge\meat\image.png"
LABELS_PATH = r"C:\Users\Reception\OneDrive - Tshwane University of Technology\Desktop\Tshepo\React Course\FoodXP\backend\model\labels.txt"  # optional

# ----- LOAD TFLITE MODEL -----
interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
interpreter.allocate_tensors()

input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# ----- LOAD AND PREPROCESS IMAGE -----
img = Image.open(IMAGE_PATH).resize((224, 224))
img_array = np.array(img, dtype=np.uint8)  # model expects UINT8
img_array = np.expand_dims(img_array, axis=0)  # add batch dimension

# ----- RUN INFERENCE -----
interpreter.set_tensor(input_details[0]['index'], img_array)
interpreter.invoke()
output_data = interpreter.get_tensor(output_details[0]['index'])
predicted_index = np.argmax(output_data)

# ----- OPTIONAL: LOAD CLASS LABELS -----
if os.path.exists(LABELS_PATH):
    with open(LABELS_PATH, "r") as f:
        labels = [line.strip() for line in f.readlines()]
    predicted_label = labels[predicted_index]
else:
    predicted_label = f"Class {predicted_index}"

# ----- PRINT RESULTS -----
print("Predicted class index:", predicted_index)
print("Predicted class label:", predicted_label)
