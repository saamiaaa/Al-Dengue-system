from pathlib import Path
import urllib.request
import zipfile

url = "https://github.com/saamiaaa/Al-Dengue-system/releases/download/models-v1/dengue-models-v1.zip"

models_dir = Path("models")
models_dir.mkdir(exist_ok=True)

zip_path = Path("dengue-models-v1.zip")

print("Downloading ML models...")

urllib.request.urlretrieve(url, zip_path)

print("Extracting ML models...")

with zipfile.ZipFile(zip_path, "r") as zip_ref:
    zip_ref.extractall(models_dir)

zip_path.unlink()

print("Model files:")
for file in models_dir.glob("*.joblib"):
    print(file.name, file.stat().st_size)