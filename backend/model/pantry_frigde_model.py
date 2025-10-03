from tensorflow.keras.models import load_model
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import numpy as np

# Load your trained model
model = load_model(r"C:\Users\Reception\OneDrive - Tshwane University of Technology\Desktop\Tshepo\React Course\FoodXP\backend\model\fridge_pantry_model.keras")

# Path to an image you want to test
img_path = r"C:\Users\Reception\Downloads\test.jpg"

# Load the image, resize to 224x224 (MobileNetV2 input size)
img = image.load_img(img_path, target_size=(224, 224))

# Convert to array and normalize
img_array = image.img_to_array(img) / 255.0

# Add batch dimension
img_array = np.expand_dims(img_array, axis=0)

predictions = model.predict(img_array)
predicted_index = np.argmax(predictions[0])  # index of the highest probability
class_labels = ['fridge', 'pantry']         # your class labels

print("Prediction:", class_labels[predicted_index])
print("Confidence:", predictions[0][predicted_index])
