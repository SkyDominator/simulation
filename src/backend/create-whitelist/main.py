import hashlib
import pandas as pd
import os
import logging
from tkinter import Tk, filedialog

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 여기에 허용할 사용자 정보를 추가하세요.
users_to_add = [
    {"name": "홍길동", "phone_number": "010-1234-5678"},
    {"name": "이순신", "phone_number": "010-9876-5432"},
]

def export_to_csv(data_df: pd.DataFrame, directory: str = None) -> str:
    """
    Export DataFrame to a CSV file in the specified directory.
    
    Args:
        data_df: DataFrame to export
        directory: Directory to save the CSV file. If None, a dialog will prompt for selection.
    
    Returns:
        Path to the saved CSV file or None if export failed
    """
    try:
        if directory is None:
            # Create a root window but hide it
            root = Tk()
            root.withdraw()
            
            # Open directory selection dialog
            directory = filedialog.askdirectory(title="Select directory to save CSV file")
            
            # Destroy the hidden root window
            root.destroy()
            
            if not directory:  # User cancelled the dialog
                logger.info("Export cancelled by user.")
                return None
        
        # Create filename with timestamp
        filename = os.path.join(directory, f"whitelist_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.csv")
        
        # Export to CSV with UTF-8-SIG encoding (adds BOM for better compatibility) and without index
        data_df.to_csv(filename, index=False, encoding='utf-8-sig')
        logger.info(f"File exported successfully to {filename}")
        return filename
    
    except Exception as e:
        logger.error(f"Error exporting CSV: {str(e)}")
        return None

# Initialize a list to store all user data including hashes
users_data = []

print("--- 생성된 해시값 목록 ---")
for user in users_to_add:
    combined_string = f"{user['name']}-{user['phone_number']}"
    hashed_value = hashlib.sha256(combined_string.encode('utf-8')).hexdigest()
    print(hashed_value)
    
    # Add user data to the list
    users_data.append({
        "name": user["name"],
        "phone_number": user["phone_number"],
        "user_hash": hashed_value
    })

# Create a pandas DataFrame
df = pd.DataFrame(users_data)
print("\nCreated DataFrame:")
print(df)

# Export to CSV
saved_path = export_to_csv(df)
if saved_path:
    print(f"\nCSV file exported successfully to: {saved_path}")
else:
    print("\nFailed to export CSV file. Check logs for details.")


