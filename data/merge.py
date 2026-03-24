import pandas as pd
import ast

print("Loading datasets...")
problems = pd.read_csv("data/raw/CodeForces.csv")
submissions = pd.read_csv("data/raw/usersCodeforcesSubmissionsEnd2024.csv")

print(f"Problems: {len(problems)} rows")
print(f"Submissions: {len(submissions)} rows")

print("\nProblems columns:", problems.columns.tolist())
print("Submissions columns:", submissions.columns.tolist())

# Merge all submissions (all verdicts)
merged = submissions.merge(
    problems[["id", "tags", "rating"]],
    left_on="id_of_submission_task",
    right_on="id",
    how="left"
)
merged.drop(columns=["id"], inplace=True)
merged.rename(columns={"rating": "problem_rating_cf"}, inplace=True)

# Explode tags so each row = one user + one topic + one submission
merged["tags"] = merged["tags"].apply(
    lambda x: ast.literal_eval(x) if pd.notnull(x) else []
)
merged_exploded = merged.explode("tags")
merged_exploded["tags"] = merged_exploded["tags"].str.strip()

print(f"\nFinal merged rows (one per tag): {len(merged_exploded)}")
print(merged_exploded.head())

merged_exploded.to_csv("data/merged_skill_data.csv", index=False)
print("\nSaved to data/merged_skill_data.csv")