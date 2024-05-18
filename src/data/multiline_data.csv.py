import os
import sys

import duckdb
import utils as ut
import pandas as pd

charts_path = "src/data/musicoset_popularity.zip"
artists_path = "src/data/musicoset_metadata.zip"
charts_url = (
    "https://marianaossilva.github.io/DSW2019/assets/data/musicoset_popularity.zip"
)
artists_url = (
    "https://marianaossilva.github.io/DSW2019/assets/data/musicoset_metadata.zip"
)
charts_file = "musicoset_popularity/artist_chart.csv"
artists_file = "musicoset_metadata/artists.csv"

if not os.path.exists(charts_path):
    ut.download_file(charts_url, charts_path)
if not os.path.exists(artists_path):
    ut.download_file(artists_url, artists_path)

charts_df = ut.load_csv_from_zip(charts_path, charts_file, "\t")
artists_df = ut.load_csv_from_zip(artists_path, artists_file, "\t")

num_weeks = 54

charts_df["week"] = pd.to_datetime(charts_df["week"])
charts_df = charts_df.sort_values("week", ascending=False)
charts_df = charts_df.drop_duplicates(subset=["week", "artist_id"])

unique_weeks = charts_df["week"].unique().tolist()
artists_set = set(charts_df[charts_df["week"] == unique_weeks[0]]["artist_id"].tolist())
artists_set.remove("0LyfQWJT6nXafLPZqxe9Of")  # remove "Various Artists"

for week in unique_weeks[1:num_weeks]:
    artists_set = artists_set.intersection(
        set(charts_df[charts_df["week"] == week]["artist_id"].tolist())
    )

artists_df = artists_df[artists_df["artist_id"].isin(artists_set)]

charts_df = duckdb.sql(
    """
    SELECT
        a.artist_id,
        a.name,
        c.rank_score,
        c.week,
    FROM charts_df c
    JOIN artists_df a
    ON c.artist_id = a.artist_id
    """
).df()

charts_df = charts_df[charts_df["week"].isin(unique_weeks[:num_weeks])]

charts_df.to_csv(sys.stdout, index=False)
