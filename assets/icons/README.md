# PWA Icons

The main icon file is `icon-512x512.png`. For a complete PWA implementation, you should create multiple sizes:

## Required Sizes

- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512 ✅ (Already included)

## How to Generate Multiple Sizes

### Option 1: Online Tool
Use [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) or similar tools

### Option 2: ImageMagick (Command Line)
```bash
convert icon-512x512.png -resize 72x72 icon-72x72.png
convert icon-512x512.png -resize 96x96 icon-96x96.png
convert icon-512x512.png -resize 128x128 icon-128x128.png
convert icon-512x512.png -resize 144x144 icon-144x144.png
convert icon-512x512.png -resize 152x152 icon-152x152.png
convert icon-512x512.png -resize 192x192 icon-192x192.png
convert icon-512x512.png -resize 384x384 icon-384x384.png
```

### Option 3: Photoshop/GIMP
Resize the 512x512 image to each required size

For now, the app will use the 512x512 icon and browsers will resize as needed.
