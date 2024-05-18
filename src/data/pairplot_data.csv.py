import os
import sys

import duckdb
import utils as ut

features_path = "src/data/musicoset_songfeatures.zip"
songs_path = "src/data/musicoset_metadata.zip"
features_url = (
    "https://marianaossilva.github.io/DSW2019/assets/data/musicoset_songfeatures.zip"
)
songs_url = (
    "https://marianaossilva.github.io/DSW2019/assets/data/musicoset_metadata.zip"
)
features_file = "musicoset_songfeatures/acoustic_features.csv"
songs_file = "musicoset_metadata/songs.csv"

if not os.path.exists(features_path):
    ut.download_file(features_url, features_path)
if not os.path.exists(songs_path):
    ut.download_file(songs_url, songs_path)

features_df = ut.load_csv_from_zip(features_path, features_file, "\t")
songs_df = ut.load_csv_from_zip(songs_path, songs_file, "\t")

songs_df = duckdb.sql(
    """
    SELECT DISTINCT ON (
        FLOOR((s.popularity / 100) * 3),
        FLOOR(f.acousticness * 3),
        FLOOR(f.danceability * 3),
        FLOOR(f.energy * 3),
        FLOOR(f.instrumentalness * 3),
        FLOOR(f.speechiness * 3),
        FLOOR(f.liveness * 3),
        FLOOR(f.valence * 3),
    )
        s.song_id,
        s.song_name,
        s.popularity,
        f.acousticness,
        f.danceability,
        f.energy,
        f.instrumentalness,
        f.speechiness,
        f.liveness,
        f.valence,
    FROM songs_df s
    JOIN features_df f
    ON s.song_id = f.song_id
    """
).df()

# print(songs_df.shape[0])
songs_df.to_csv(sys.stdout, index=False)
