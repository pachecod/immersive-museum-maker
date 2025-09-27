<!--
Immersive Museum Maker - CORS Setup Guide for Asset Hosting

Copyright (C) 2025  Dan Pacheco

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License in the LICENSE file of this repository for more details.
-->

# CORS Setup Guide for Immersive Museum Maker

This guide explains how to set up CORS-compliant hosting for assets (3D models, textures, audio files) used in the Immersive Museum Maker editor and exports.

## What is CORS and Why Do You Need It?

**CORS (Cross-Origin Resource Sharing)** is a web security feature that controls which domains can access resources from your server. When the Immersive Museum Maker loads assets from URLs, the browser enforces CORS policies to prevent unauthorized access.

### Common CORS Issues
- **3D models (GLB/GLTF)** fail to load from external URLs
- **Textures and images** show as broken or fail to load
- **Audio files** don't play in the browser
- **Console errors** like "Access to fetch at 'URL' from origin 'localhost' has been blocked by CORS policy"

## CORS-Required Headers

Your asset hosting server must include these headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Content-Type, Range
Access-Control-Expose-Headers: Content-Length, Content-Range
```

## Hosting Solutions

### 1. Netlify (Recommended for Static Assets)

**Setup:**
1. Create a `_headers` file in your site root:
```
/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Range
  Access-Control-Expose-Headers: Content-Length, Content-Range
```

2. Or use `netlify.toml`:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "GET, HEAD, OPTIONS"
    Access-Control-Allow-Headers = "Content-Type, Range"
    Access-Control-Expose-Headers = "Content-Length, Content-Range"
```

**Pros:**
- Free tier available
- Easy drag-and-drop deployment
- Automatic HTTPS
- CDN distribution

**Cons:**
- File size limits (100MB on free tier)
- No server-side processing

### 2. Vercel

**Setup:**
Create `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, HEAD, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Range"
        }
      ]
    }
  ]
}
```

**Pros:**
- Excellent performance
- Easy GitHub integration
- Free tier available

### 3. GitHub Pages

**Setup:**
GitHub Pages doesn't support custom headers, but you can use a proxy service:

1. Use a service like [CORS Anywhere](https://github.com/Rob--W/cors-anywhere) (for development)
2. Or host assets on a CORS-enabled service and reference them

**Limitations:**
- No custom headers support
- File size limits
- Requires workarounds for CORS

### 4. AWS S3 + CloudFront

**Setup:**
1. **S3 Bucket Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

2. **CloudFront Headers:**
```json
{
  "ResponseHeadersPolicy": {
    "CORS": {
      "AccessControlAllowCredentials": false,
      "AccessControlAllowHeaders": {
        "Items": ["Content-Type", "Range"]
      },
      "AccessControlAllowMethods": {
        "Items": ["GET", "HEAD", "OPTIONS"]
      },
      "AccessControlAllowOrigins": {
        "Items": ["*"]
      },
      "AccessControlExposeHeaders": {
        "Items": ["Content-Length", "Content-Range"]
      },
      "OriginOverride": false
    }
  }
}
```

**Pros:**
- Highly scalable
- CDN distribution
- Pay-as-you-go pricing

**Cons:**
- More complex setup
- Requires AWS knowledge

### 5. Firebase Hosting

**Setup:**
Create `firebase.json`:
```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          },
          {
            "key": "Access-Control-Allow-Methods",
            "value": "GET, HEAD, OPTIONS"
          },
          {
            "key": "Access-Control-Allow-Headers",
            "value": "Content-Type, Range"
          }
        ]
      }
    ]
  }
}
```

**Pros:**
- Google infrastructure
- Easy deployment
- Free tier available

### 6. Self-Hosted Solutions

#### Node.js/Express Server
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  next();
});
```

#### Apache (.htaccess)
```apache
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, HEAD, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Range"
Header always set Access-Control-Expose-Headers "Content-Length, Content-Range"
```

#### Nginx
```nginx
location / {
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, HEAD, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Range' always;
    add_header 'Access-Control-Expose-Headers' 'Content-Length, Content-Range' always;
}
```

## Testing CORS Configuration

### Browser Developer Tools
1. Open browser DevTools (F12)
2. Go to Network tab
3. Load your asset URL
4. Check response headers for CORS headers

### Online CORS Testers
- [CORS Tester](https://www.test-cors.org/)
- [HTTP Header Checker](https://www.webconfs.com/http-header-check.php)

### Command Line Test
```bash
curl -H "Origin: http://localhost:3001" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-asset-host.com/model.glb
```

## Best Practices

### 1. File Organization
```
assets/
├── models/
│   ├── furniture/
│   ├── characters/
│   └── buildings/
├── textures/
│   ├── walls/
│   ├── floors/
│   └── materials/
└── audio/
    ├── ambient/
    ├── effects/
    └── music/
```

### 2. URL Structure
- Use consistent, descriptive URLs
- Include file extensions
- Use HTTPS for all assets

### 3. Performance Optimization
- Compress 3D models (GLB format)
- Optimize texture sizes
- Use CDN for global distribution
- Implement caching headers

### 4. Security Considerations
- Use `Access-Control-Allow-Origin: *` only for public assets
- For sensitive content, specify exact origins
- Consider using signed URLs for private assets

## Troubleshooting

### Common Issues

**Issue:** "Failed to load 3D model"
**Solution:** Check CORS headers and file format (GLB/GLTF)

**Issue:** "Texture not loading"
**Solution:** Verify image format and CORS headers

**Issue:** "Audio not playing"
**Solution:** Check audio format and CORS headers

**Issue:** "Mixed content error"
**Solution:** Use HTTPS for all assets when serving over HTTPS

### Debug Steps
1. Check browser console for CORS errors
2. Verify asset URLs are accessible
3. Test CORS headers with online tools
4. Check file formats and sizes
5. Verify server configuration

## Example Asset URLs

Once properly configured, your assets should be accessible like:

```
https://your-cors-host.com/models/chair.glb
https://your-cors-host.com/textures/wood.jpg
https://your-cors-host.com/audio/ambient.mp3
```

## Additional Resources

- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [A-Frame Asset Loading](https://aframe.io/docs/1.4.0/core/asset-management-system.html)
- [Three.js Loading Manager](https://threejs.org/docs/#api/en/loaders/managers/LoadingManager)

---

**Need Help?** If you encounter CORS issues, check the browser console for specific error messages and verify your hosting configuration matches the requirements above.
