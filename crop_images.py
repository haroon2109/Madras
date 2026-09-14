import os
from PIL import Image

def crop_login(img_path, out_path):
    img = Image.open(img_path)
    w, h = img.size
    # Left part of the image, let's say left 40% or 50%
    # But wait! I can just use the whole image as a background if I want, but it has the form.
    # Let's crop the left 50%.
    box = (0, 0, int(w*0.5), h)
    cropped = img.crop(box)
    cropped.save(out_path)

def crop_dashboard(img_path, out_path):
    img = Image.open(img_path)
    w, h = img.size
    # Dashboard hero is at the top. Let's crop the top 30%.
    box = (0, 0, w, int(h*0.3))
    cropped = img.crop(box)
    cropped.save(out_path)

def crop_landing(img_path, out_path):
    img = Image.open(img_path)
    w, h = img.size
    # Landing hero is at the top.
    box = (0, 0, w, int(h*0.4))
    cropped = img.crop(box)
    cropped.save(out_path)

user_dir = '/home/mdharoon/.gemini/antigravity-ide/brain/c09a9255-5d8d-40a8-b0a0-f7dd2ebc4ed6/.user_uploaded'
crop_login(os.path.join(user_dir, 'media_1789036972383.png'), 'public/images/login-illustration.png')
crop_dashboard(os.path.join(user_dir, 'media_1789036980327.png'), 'public/images/dashboard-illustration.png')
print("Cropped images successfully!")
