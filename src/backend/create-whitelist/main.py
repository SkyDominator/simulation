import hashlib
import pandas as pd
import os
import logging
from tkinter import Tk, filedialog

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def load_users_from_csv(csv_path: str) -> list:
    """
    Load users from CSV file with name and phone_number columns.
    
    Args:
        csv_path: Path to the CSV file
        
    Returns:
        List of user dictionaries with name and phone_number
    """
    try:
        df = pd.read_csv(csv_path)
        
        if 'name' not in df.columns or 'phone_number' not in df.columns:
            raise ValueError("CSV file must contain 'name' and 'phone_number' columns")
        
        users = []
        for _, row in df.iterrows():
            # Add "0" to the beginning of phone number if it doesn't start with "0"
            phone_number = str(row['phone_number']).strip()
            if not phone_number.startswith('0'):
                phone_number = '0' + phone_number
            
            users.append({
                "name": str(row['name']).strip(),
                "phone_number": phone_number
            })
        
        logger.info(f"Loaded {len(users)} users from CSV file")
        return users
        
    except Exception as e:
        logger.error(f"Error loading CSV file: {str(e)}")
        raise

def select_csv_file() -> str | None:
    """
    Open file dialog to select CSV file.
    
    Returns:
        Path to selected CSV file or None if cancelled
    """
    try:
        root = Tk()
        root.withdraw()
        
        file_path = filedialog.askopenfilename(
            title="Select CSV file with user data",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
        )
        
        root.destroy()
        
        if file_path:
            logger.info(f"Selected CSV file: {file_path}")
            return file_path
        else:
            logger.info("CSV file selection cancelled by user")
            return None
            
    except Exception as e:
        logger.error(f"Error selecting CSV file: {str(e)}")
        raise

def export_to_csv(data_df: pd.DataFrame, directory: str | None = None) -> str | None:
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

# Main execution
if __name__ == "__main__":
    # Select CSV file
    csv_path = select_csv_file()
    if not csv_path:
        print("No CSV file selected. Exiting.")
        exit(1)
    
    # Load users from CSV
    try:
        users_to_add = load_users_from_csv(csv_path)
    except Exception as e:
        print(f"Error loading CSV file: {e}")
        exit(1)

# Initialize a list to store all user data including hashes
users_data = []

print("--- 생성된 해시값 목록 ---")
print(f"해시할 인원 수: {len(users_to_add)}")

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


