from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn
import os
import mimetypes

serve_dir = "/"

class ServeDirMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not os.path.exists(serve_dir):
            print(f"Serve directory {serve_dir} not found, recreating...")
            os.makedirs(serve_dir, exist_ok=True)
        return await call_next(request)

app = FastAPI()
app.add_middleware(ServeDirMiddleware)
os.makedirs(serve_dir, exist_ok=True)
# REMOVE STATIC FILES MOUNT
# app.mount('/', StaticFiles(directory=serve_dir, html=True), name='site')

def sanitize_path(path: str) -> str:
    real_path = os.path.realpath(os.path.join(serve_dir, path.lstrip("/")))
    if not real_path.startswith(os.path.realpath(serve_dir)):
        raise ValueError("Path traversal detected")
    return real_path

def multipart_stream(files):
    boundary = "FILEBOUNDARYqwerty"
    for file_info in files:
        file_path = file_info["path"]
        filename = os.path.basename(file_path)
        content_type = file_info["type"]
        yield f"--{boundary}\r\n".encode()
        yield f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode()
        yield f"Content-Type: {content_type}\r\n\r\n".encode()
        with open(file_path, "rb") as f:
            while True:
                chunk = f.read(16384)
                if not chunk:
                    break
                yield chunk
        yield b"\r\n"
    yield f"--{boundary}--\r\n".encode()

@app.post("/multi-files")
async def get_multiple_files(req: Request):
    data = await req.json()
    if "paths" not in data or not isinstance(data["paths"], list):
        return {"error": "Missing paths"}
    files = []
    for p in data["paths"]:
        try:
            real_path = sanitize_path(p)
            if not os.path.isfile(real_path):
                continue
            mime = mimetypes.guess_type(real_path)[0] or "application/octet-stream"
            files.append({"path": real_path, "type": mime})
        except Exception:
            continue
    if not files:
        return {"error": "No valid files"}
    boundary = "FILEBOUNDARYqwerty"
    headers = {
        "Content-Type": f"multipart/mixed; boundary={boundary}",
        "Content-Disposition": "inline"
    }
    return StreamingResponse(multipart_stream(files), headers=headers)

if __name__ == '__main__':
    print(f"Starting server with auto-reload, serving files from: {serve_dir}")
    uvicorn.run("multi_file_server:app", host="0.0.0.0", port=8099, reload=True)
    