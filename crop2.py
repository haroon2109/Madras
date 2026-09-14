from PIL import Image

# 1. Login Illustration
img_login = Image.open('/home/mdharoon/.gemini/antigravity-ide/brain/c09a9255-5d8d-40a8-b0a0-f7dd2ebc4ed6/.user_uploaded/media_1789036972383.png')
w, h = img_login.size
img_login.crop((0, 0, int(w*0.5), h)).save('public/images/login-illustration.png')

# 2. Hero Illustration (Dashboard top right)
img_dash = Image.open('/home/mdharoon/.gemini/antigravity-ide/brain/c09a9255-5d8d-40a8-b0a0-f7dd2ebc4ed6/.user_uploaded/media_1789036980327.png')
w, h = img_dash.size
img_dash.crop((int(w*0.5), 0, w, int(h*0.35))).save('public/images/hero-illustration.png')

# 3. Landing Hero Illustration (Chennai)
img_land = Image.open('/home/mdharoon/.gemini/antigravity-ide/brain/c09a9255-5d8d-40a8-b0a0-f7dd2ebc4ed6/.user_uploaded/media_1789037015571.png')
w, h = img_land.size
img_land.crop((0, 0, w, int(h*0.45))).save('public/images/chennai-illustration.png')

# 4. Control Room Illustration (Landing bottom)
img_land.crop((0, int(h*0.75), w, h)).save('public/images/control-room-illustration.png')

