# Avatar crop face detector

`face_detection_yunet_2023mar.onnx` is YuNet from the official OpenCV Zoo
`models/face_detection_yunet` directory:
https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet

OpenCV Zoo marks the models in this directory as MIT licensed. The model is
used only to propose face bounds; avatar crops still require checks for face
center, headwear, head size, and both shoulders before formal acceptance.
