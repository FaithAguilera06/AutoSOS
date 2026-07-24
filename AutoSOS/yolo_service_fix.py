#!/usr/bin/env python3
"""
Fix for YOLOv8 service error: 'bytes' object has no attribute 'tobytes'
"""

# The error is likely in the caching section of main.py around line 416-421
# Here's the problematic code and fix:

# PROBLEMATIC CODE (in main.py):
"""
# Cache the result
cache_key = f"yolo:detect:{hash(image_data.tobytes())}"
await redis_client.setex(
    cache_key,
    3600,  # 1 hour
    json.dumps(response_data)
)
"""

# FIXED CODE:
"""
# Cache the result - fix the bytes issue
if hasattr(image_data, 'tobytes'):
    # image_data is a numpy array
    cache_key = f"yolo:detect:{hash(image_data.tobytes())}"
else:
    # image_data is already bytes
    cache_key = f"yolo:detect:{hash(image_data)}"

await redis_client.setex(
    cache_key,
    3600,  # 1 hour
    json.dumps(response_data)
)
"""

# ALTERNATIVE FIX (simpler):
"""
# Just disable caching temporarily to fix the immediate issue
# Comment out or remove the caching section entirely:

# Cache the result
# cache_key = f"yolo:detect:{hash(image_data.tobytes())}"
# await redis_client.setex(
#     cache_key,
#     3600,  # 1 hour
#     json.dumps(response_data)
# )
"""

print("YOLOv8 Service Fix:")
print("1. The error is in the caching section of main.py")
print("2. image_data is already bytes, not a numpy array")
print("3. Remove .tobytes() call or add proper type checking")
print("4. Or disable caching temporarily to fix the issue")
