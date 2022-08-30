import torch
import time
import socket

import cv2

from pymongo import MongoClient
import pprint

model = torch.hub.load('ultralytics/yolov5', 'yolov5s')

client = MongoClient('mongodb://5gwebxr.com:27017/')
db = client['5gwebxr']
collection = db['recognitions']

# print(collection.find_one())


def server():
    UDP_IP = "127.0.0.1"
    UDP_PORT = 5000

    sock = socket.socket(socket.AF_INET,  # Internet
                         socket.SOCK_DGRAM)  # UDP
    sock.bind((UDP_IP, UDP_PORT))

    while True:
        data, addr = sock.recvfrom(1024)

        time_recv = time.time_ns()//1000000
        data_split = (data.decode()).split(" ")
        client_id = data_split[0]
        track = data_split[1]
        print(
            f"[{time.time_ns()//1000000} {client_id} {track}] Request received to process video")

        start = time.time_ns()
        vidcap = cv2.VideoCapture(f'videos/{client_id}.webm')
        success, image = vidcap.read()
        count = 0
        while success:
            # cv2.imwrite("frame%d.jpg" % count, image)     # save frame as JPEG file
            if count < 1:
                results = model(image)
                results_json = results.pandas(
                ).xyxy[0].to_json(orient="records")

                results_to_insert = {
                    "client": client_id,
                    "timestamp": time_recv,
                    "results": results_json
                }

                results_id = collection.insert_one(
                    results_to_insert).inserted_id
                print(
                    f"[{time.time_ns()//1000000} {client_id} {track}] Inserted recognition results to cloud database")

                # print(results.pandas().xyxy[0])
            else:
                break
            success, image = vidcap.read()
            count += 1
        finish = time.time_ns()
        print(
            f"[{time.time_ns()//1000000} {client_id} {track}] Analysing video in YOLOv5 took {(finish-start) // 1_000_000} ms")


if __name__ == "__main__":
    server()
