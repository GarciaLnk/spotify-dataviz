import os
import sys

import duckdb
import utils as ut

path = "src/data/musicoset_metadata.zip"
url = "https://marianaossilva.github.io/DSW2019/assets/data/musicoset_metadata.zip"
artists_file = "musicoset_metadata/artists.csv"
songs_file = "musicoset_metadata/songs.csv"

if not os.path.exists(path):
    ut.download_file(url, path)

artists_df = ut.load_csv_from_zip(path, artists_file, "\t").dropna(subset=["followers"])

artists_df = duckdb.sql(
    """
    SELECT name, followers::BIGINT as followers, popularity
    FROM artists_df
    ORDER BY popularity DESC
    LIMIT 50
    """
).df()

artists_df.to_csv(sys.stdout, index=False)
