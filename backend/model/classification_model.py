import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.callbacks import ModelCheckpoint
from sklearn.utils.class_weight import compute_class_weight
import numpy as np
import os

# ---------------------------
# SETTINGS
# ---------------------------
IMG_SIZE = (224, 224)           # MobileNetV2 input size
BATCH_SIZE = 32
EPOCHS = 10                     # adjust as needed
DATASET_PATH = r"C:\Projects Programming\Wil Project\model data-20250923T084920Z-1-001\model data"
MODEL_SAVE_PATH = r"C:\Projects Programming\Wil Project\FoodXP\backend\model\fridge_pantry_model.keras"

# ---------------------------
# LOAD DATASETS
# ---------------------------
# Load images without resizing (keep original)
full_dataset = tf.keras.preprocessing.image_dataset_from_directory(
    DATASET_PATH,
    image_size=IMG_SIZE,  # keep original size
    batch_size=BATCH_SIZE,
    label_mode="categorical",
    shuffle=True
)

# Split into train/validation
dataset_size = len(full_dataset)
train_size = int(0.8 * dataset_size)
train_dataset = full_dataset.take(train_size)
val_dataset = full_dataset.skip(train_size)

# ---------------------------
# CALCULATE CLASS WEIGHTS
# ---------------------------
labels = []
for batch in train_dataset.unbatch():
    labels.append(np.argmax(batch[1].numpy()))

labels = np.array(labels)

class_weights = compute_class_weight(
    class_weight='balanced',
    classes=np.unique(labels),
    y=labels
)
class_weights_dict = dict(enumerate(class_weights))
print("Class weights:", class_weights_dict)

# ---------------------------
# DATA AUGMENTATION + PREPROCESSING
# ---------------------------
def resize_with_pad(img, label):
    img = tf.image.resize_with_pad(img, IMG_SIZE[0], IMG_SIZE[1])
    img = tf.cast(img, tf.float32) / 255.0
    return img, label

train_dataset = train_dataset.map(resize_with_pad)
val_dataset = val_dataset.map(resize_with_pad)

data_augmentation = tf.keras.Sequential([
    layers.RandomFlip('horizontal'),
    layers.RandomRotation(0.1),
    layers.RandomZoom(0.1),
])

# ---------------------------
# CREATE MODEL
# ---------------------------
base_model = MobileNetV2(
    input_shape=IMG_SIZE + (3,),
    include_top=False,
    weights='imagenet'
)
base_model.trainable = False

model = models.Sequential([
    data_augmentation,
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.Dropout(0.3),
    layers.Dense(2, activation='softmax')  # 2 classes: fridge, pantry
])

model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

# ---------------------------
# TRAIN MODEL
# ---------------------------
checkpoint = ModelCheckpoint(
    MODEL_SAVE_PATH,
    monitor='val_accuracy',
    save_best_only=True,
    save_weights_only=False,
    verbose=1
)

history = model.fit(
    train_dataset,
    validation_data=val_dataset,
    epochs=EPOCHS,
    callbacks=[checkpoint],
    class_weight=class_weights_dict
)

# ---------------------------
# SAVE MODEL
# ---------------------------
model.save(MODEL_SAVE_PATH)
print(f"Model saved to {MODEL_SAVE_PATH}")