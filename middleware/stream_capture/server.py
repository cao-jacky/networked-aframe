import asyncio
import websockets
import socket

import os

import time

UDP_IP = "127.0.0.1"
UDP_PORT = 5000

async def server(websocket):
    track = 0

    session_id = 0
    client_id = 0
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    while True:
        data = await websocket.recv()
        data_len = len(data)

        # Save the binary blob as base64
        if data_len > 100:
            print(
                f'[{time.time_ns()//1000000} {client_id} {track}] Received data of length {data_len} for client {client_id} in session {session_id}, assigning internal ID of {track}')

            with open(f'videos/{client_id}.webm', 'wb') as f_vid:
                f_vid.write((data))

            # start = time.time_ns()
            # os.system(
            #     f'ffmpeg -hide_banner -loglevel error -y -i videos/{client_id}.webm videos/{client_id}.mp4')
            # finish = time.time_ns()

            # print(
            #     f"[{time.time_ns()//1000000} {client_id} {track}] Converting the received video from .webm to .mp4 takes {(finish-start) // 1_000_000} ms")
            
            client_track = f"{client_id} {track}"
            sock.sendto(str.encode(client_track), (UDP_IP, UDP_PORT))
            print(
                f"[{time.time_ns()//1000000} {client_id} {track}] Telling detect.py script to analyse the video for current client")
            track += 1
        elif data_len > 0:
            data_split = data.split(" ")
            session_id = data_split[0]
            client_id = data_split[1]


start_server = websockets.serve(server, '0.0.0.0', 8000)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()

print("Server ready to accept incoming WebSocket connections")

# # Read back the binary blob from base64
# with open('file.webm', 'rb') as f_vid:
#     video_stream = base64.b64decode(f_vid.read())

# print(video_stream)
