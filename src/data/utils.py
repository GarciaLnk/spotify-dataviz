import zipfile

import pandas as pd
import requests


def download_file(url: str, path: str) -> None:
    r = requests.get(url)
    with open(path, "wb") as f:
        f.write(r.content)


def load_csv_from_zip(path: str, file: str, sep: str = ",") -> pd.DataFrame:
    with open(path, "rb") as f:
        with zipfile.ZipFile(f) as z:
            with z.open(file) as tsv:
                return pd.read_csv(tsv, sep=sep)
