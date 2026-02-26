#####
# AI-DietCare

## Prerequisites
- Python 3.10+
- uv package manager

conda activate base
## 1. Install uv
pip install uv

## 2. Create Virtual Environment
uv venv
This will create a `.venv` folder.

## 3. Activate Virtual Environment

.vev/scripts/activate

##
uv init

## 4. Install Dependencies

If using requirements.txt:
uv pip install -r requirements.txt

## 5. Run the Application

Run main app:
uv run python app.py

Run clinical trial file (if needed):
uv run python clinicaltrial.py

---

## 6. Open API Documentation

After running the app, open:
http://localhost:8080/docs

You will see the Swagger API documentation page.