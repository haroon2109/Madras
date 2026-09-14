from PIL import Image
import sys

img_login = Image.open('/home/mdharoon/.gemini/antigravity-ide/brain/c09a9255-5d8d-40a8-b0a0-f7dd2ebc4ed6/.user_uploaded/media_1789036972383.png')
w, h = img_login.size
img_login.crop((0, 0, int(w*0.5), h)).save('public/images/login-illustration.png')

img_dash = Image.open('/home/mdharoon/.gemini/antigravity-ide/brain/c09a9255-5d8d-40a8-b0a0-f7dd2ebc4ed6/.user_uploaded/media_1789036980327.png')
w, h = img_dash.size
img_dash.crop((int(w*0.5), 0, w, int(h*0.35))).save('public/images/dashboard-illustration.png')

