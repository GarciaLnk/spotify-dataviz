import ast
import json
import os
import sys
from collections import defaultdict

import duckdb
import utils as ut

path = "src/data/musicoset_metadata.zip"
url = "https://marianaossilva.github.io/DSW2019/assets/data/musicoset_metadata.zip"
artists_file = "musicoset_metadata/artists.csv"
songs_file = "musicoset_metadata/songs.csv"

if not os.path.exists(path):
    ut.download_file(url, path)

artists_df = ut.load_csv_from_zip(path, artists_file, "\t").dropna(subset=["followers"])
artists_df["genres"] = artists_df["genres"].apply(ast.literal_eval)
artists_df = artists_df[artists_df["genres"].apply(lambda x: x != [""] and x != [])]
artists_df = artists_df[artists_df["followers"] >= 1]
artists_df_exploded = artists_df.explode("genres")[
    ["artist_id", "name", "popularity", "followers", "genres"]
]

songs_df = ut.load_csv_from_zip(path, songs_file, "\t").dropna(subset=["artists"])
songs_df["artists"] = songs_df["artists"].apply(ast.literal_eval)
songs_df_exploded = songs_df.explode("artists").drop_duplicates(
    subset=["song_name", "artists"]
)

genres_df = duckdb.sql(
    """
    SELECT
        genres AS genre_name,
        COUNT(DISTINCT name) AS num_artists,
        AVG(popularity) AS avg_popularity
    FROM artists_df_exploded
    GROUP BY genres
    HAVING num_artists > 100
    ORDER BY num_artists DESC
    """
).df()

artists_df = duckdb.sql(
    """
    SELECT a.name, a.followers, a.popularity, a.genres,
    (
        SELECT json_group_object(json_array(sorted.song_name, sorted.song_id),
                                 sorted.popularity)
        FROM (
            SELECT s.song_name, s.song_id, s.popularity
            FROM songs_df_exploded s
            WHERE s.artists = a.artist_id
            ORDER BY s.popularity DESC
        ) sorted
    ) AS songs,
    (
        SELECT SUM(s.popularity)
        FROM songs_df_exploded s
        WHERE s.artists = a.artist_id
    ) AS sum_popularities
    FROM artists_df a
    WHERE sum_popularities > 0
    """
).df()

hierarchy = {"name": "genres", "children": []}
unique_genres = genres_df["genre_name"].unique()
avg_popularity_map = genres_df.set_index("genre_name")["avg_popularity"].to_dict()

genre_artist_map = defaultdict(list)
for _, row in artists_df.iterrows():
    for genre in row["genres"]:
        if genre in unique_genres:
            genre_artist_map[genre].append(row)

hierarchy["children"] = [
    {
        "name": genre,
        "popularity": avg_popularity_map[genre],
        "children": [
            {
                "name": artist["name"],
                "followers": int(artist["followers"]),
                "popularity": artist["popularity"],
                "children": [
                    {
                        "name": json.loads(song)[0],
                        "popularity": popularity,
                        "value": int(
                            popularity
                            / artist["sum_popularities"]
                            * artist["followers"]
                        ),
                        "url": f"https://open.spotify.com/track/{json.loads(song)[1]}",
                    }
                    for song, popularity in json.loads(artist["songs"]).items()
                ],
            }
            for artist in genre_artist_map[genre]
        ],
    }
    for genre in unique_genres
]


json.dump(hierarchy, sys.stdout, ensure_ascii=False)
