from PIL import Image

def analyze(img_path):
    img = Image.open(img_path)
    w, h = img.size
    print(f"Image {img_path}: {w}x{h}")
    # Let's check the color of the rightmost pixels. If it's a login form, it would have white background.
    # If it's just the illustration, the rightmost pixels would not be all white.
    right_pixels = [img.getpixel((w-1, y)) for y in range(0, h, 10)]
    white_count = sum(1 for p in right_pixels if p[:3] == (255, 255, 255))
    print(f"Rightmost white pixels: {white_count} / {len(right_pixels)}")

user_dir = '/home/mdharoon/.gemini/antigravity-ide/brain/c09a9255-5d8d-40a8-b0a0-f7dd2ebc4ed6/.user_uploaded'
analyze(user_dir + '/media_1789036972383.png')
analyze(user_dir + '/media_1789036980327.png')
analyze(user_dir + '/media_1789037015571.png')
