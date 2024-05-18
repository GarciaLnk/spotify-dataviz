import ast
import os
import sys

import duckdb
import pandas as pd
import utils as ut

path = "src/data/musicoset_metadata.zip"
url = "https://marianaossilva.github.io/DSW2019/assets/data/musicoset_metadata.zip"
artists_file = "musicoset_metadata/artists.csv"
songs_file = "musicoset_metadata/songs.csv"

if not os.path.exists(path):
    ut.download_file(url, path)

artists_df = ut.load_csv_from_zip(path, artists_file, "\t").dropna(subset=["followers"])
artists_df["genres"] = artists_df["genres"].apply(ast.literal_eval)
artists_df_exploded = artists_df.explode("genres")[
    ["name", "popularity", "followers", "genres"]
]

genres = ["pop", "rock", "rap", "hip hop", "r&b"]
genres_df = pd.DataFrame(genres, columns=["genre"])

artists_df = duckdb.sql(
    """
    WITH ranked_artists AS (
        SELECT a.name, a.followers, a.popularity, a.genres,
               ROW_NUMBER() OVER (PARTITION BY a.genres ORDER BY a.popularity DESC) as rn
        FROM artists_df_exploded a
        WHERE a.genres IN (SELECT genre FROM genres_df)
    )
    SELECT name, followers::BIGINT as followers, popularity, genres
    FROM ranked_artists
    WHERE rn <= 50
    """
).df()

artists_df.to_csv(sys.stdout, index=False)
