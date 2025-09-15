"""
importing mobilenetv2
"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

from keras.applications.mobilenet_v2 import MobileNetV2
model = MobileNetV2(weights='imagenet')