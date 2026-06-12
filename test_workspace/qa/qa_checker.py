import os
import yaml

def check_storyboard(yaml_file):
    """
    Validates the Storyboard YAML schema as defined in QA checking loop.
    """
    print(f"Checking {yaml_file}...")
    if not os.path.exists(yaml_file):
        print(f" [FAIL] Storyboard file {yaml_file} not found.")
        return False
        
    try:
        with open(yaml_file, 'r') as f:
            data = yaml.safe_load(f)
            
        if 'scenes' not in data:
            print(" [FAIL] 'scenes' key missing from storyboard.")
            return False
            
        print(" [PASS] Storyboard schema appears valid.")
        return True
    except Exception as e:
        print(f" [FAIL] YAML parsing error: {e}")
        return False

def check_assets(assets_dir, required_assets):
    """
    Checks if all referenced assets exist in the assets folder.
    """
    print("Checking assets...")
    all_exist = True
    for asset in required_assets:
        asset_path = os.path.join(assets_dir, asset)
        if not os.path.exists(asset_path):
            print(f" [FAIL] Missing asset: {asset}")
            all_exist = False
            
    if all_exist:
        print(" [PASS] All required assets found.")
    return all_exist

def run_qa_pipeline():
    print("Running QA Checking Loop...")
    # Simulate checking a storyboard
    check_storyboard("../script/storyboard.yaml")
    
    # Simulate checking assets
    check_assets("../assets", ["bg.png", "title.png"])
    
    print("QA Checking Loop completed.\n")

if __name__ == "__main__":
    run_qa_pipeline()
