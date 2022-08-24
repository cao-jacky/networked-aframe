import torch
import time
import socket

import cv2

model = torch.hub.load('ultralytics/yolov5', 'yolov5s')


def server():
    UDP_IP = "127.0.0.1"
    UDP_PORT = 5000

    sock = socket.socket(socket.AF_INET,  # Internet
                         socket.SOCK_DGRAM)  # UDP
    sock.bind((UDP_IP, UDP_PORT))

    while True:
        data, addr = sock.recvfrom(1024)

        data_split = (data.decode()).split(" ")
        client_id = data_split[0]
        track = data_split[1]
        print(
            f"[{time.time_ns()//1000000} {client_id} {track}] Request received to process video")

        start = time.time_ns()
        vidcap = cv2.VideoCapture(f'videos/{client_id}.mp4')
        success, image = vidcap.read()
        count = 0
        while success:
            # cv2.imwrite("frame%d.jpg" % count, image)     # save frame as JPEG file
            if count < 1:
                results = model(image)
                # results.show()
                print(results.pandas().xyxy[0])
            else:
                break
            success, image = vidcap.read()
            count += 1
        finish = time.time_ns()
        print(
            f"[{time.time_ns()//1000000}] Analysing video in YOLOv5 took {(finish-start) // 1_000_000} ms")


if __name__ == "__main__":
    server()
