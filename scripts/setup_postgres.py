import os
import sys
import time
import zipfile
import urllib.request
import subprocess

PG_URL = "https://get.enterprisedb.com/postgresql/postgresql-16.4-1-windows-x64-binaries.zip"
BASE_DIR = r"d:\invoiceP"
ZIP_PATH = os.path.join(BASE_DIR, "pgsql_binaries.zip")
EXTRACT_DIR = BASE_DIR # will create d:\invoiceP\pgsql
PG_BIN = os.path.join(BASE_DIR, "pgsql", "bin")
DATA_DIR = os.path.join(BASE_DIR, "pgsql", "data")
LOG_PATH = os.path.join(BASE_DIR, "pgsql", "logfile.log")

def download_file(url, target_path):
    if os.path.exists(target_path) and os.path.getsize(target_path) > 300 * 1024 * 1024:
        print(f"Archive already downloaded ({os.path.getsize(target_path)} bytes). Skipping download.")
        return

    print(f"Downloading PostgreSQL binaries from {url}...")
    start_time = time.time()

    def reporthook(count, block_size, total_size):
        if count % 500 == 0:
            downloaded_mb = (count * block_size) / (1024 * 1024)
            total_mb = total_size / (1024 * 1024)
            pct = (downloaded_mb / total_mb) * 100 if total_mb > 0 else 0
            elapsed = time.time() - start_time
            rate = downloaded_mb / elapsed if elapsed > 0 else 0
            print(f"  Progress: {downloaded_mb:.1f}/{total_mb:.1f} MB ({pct:.1f}%) @ {rate:.2f} MB/s", end="\r")

    urllib.request.urlretrieve(url, target_path, reporthook)
    print(f"\nDownload completed in {time.time() - start_time:.1f} seconds.")

def extract_archive(zip_path, target_dir):
    print("Extracting archive...")
    start_time = time.time()
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(target_dir)
    print(f"Extracted to {target_dir} in {time.time() - start_time:.1f} seconds.")

def setup_database():
    initdb_exe = os.path.join(PG_BIN, "initdb.exe")
    pg_ctl_exe = os.path.join(PG_BIN, "pg_ctl.exe")
    psql_exe = os.path.join(PG_BIN, "psql.exe")

    if not os.path.exists(DATA_DIR):
        print(f"Initializing database cluster at {DATA_DIR}...")
        # create pwfile
        pwfile = os.path.join(BASE_DIR, "pg_pw.txt")
        with open(pwfile, "w") as f:
            f.write("InvoiceHub@2024")

        cmd = [
            initdb_exe,
            "-D", DATA_DIR,
            "-U", "postgres",
            "-A", "scram-sha-256",
            f"--pwfile={pwfile}",
            "-E", "UTF8",
            "--locale=C"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        print("initdb output:", res.stdout)
        if res.returncode != 0:
            print("initdb error:", res.stderr)
            sys.exit(1)
        if os.path.exists(pwfile):
            os.remove(pwfile)
        print("Database cluster initialized successfully.")
    else:
        print(f"Data directory {DATA_DIR} already exists.")

    # Start postgres server
    print("Starting PostgreSQL server...")
    start_cmd = [
        pg_ctl_exe,
        "-D", DATA_DIR,
        "-l", LOG_PATH,
        "start"
    ]
    res = subprocess.run(start_cmd, capture_output=True, text=True)
    print("pg_ctl start output:", res.stdout)
    time.sleep(3)

    # Create invoicehub database if not exists
    print("Creating invoicehub database...")
    env = os.environ.copy()
    env["PGPASSWORD"] = "InvoiceHub@2024"

    create_db_cmd = [
        psql_exe,
        "-U", "postgres",
        "-h", "localhost",
        "-p", "5432",
        "-c", "CREATE DATABASE invoicehub;"
    ]
    res = subprocess.run(create_db_cmd, env=env, capture_output=True, text=True)
    print("CREATE DATABASE output:", res.stdout or res.stderr)
    print("PostgreSQL is running and ready for connections!")

if __name__ == "__main__":
    download_file(PG_URL, ZIP_PATH)
    if not os.path.exists(os.path.join(BASE_DIR, "pgsql", "bin")):
        extract_archive(ZIP_PATH, EXTRACT_DIR)
    setup_database()

