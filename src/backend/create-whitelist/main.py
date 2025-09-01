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
    {"name": "김현영", "phone_number": "01031274918"},
    {"name": "신성애", "phone_number": "01030417102"},
    {"name": "유광춘", "phone_number": "01096678299"},
    {"name": "이채은", "phone_number": "01029837228"},
    {"name": "이진숙", "phone_number": "01029837228"},
    {"name": "김미숙", "phone_number": "01024203166"},
    {"name": "이운한", "phone_number": "01052345740"},
    {"name": "유한영", "phone_number": "01071883166"},
    {"name": "유재이", "phone_number": "01049073166"},
    {"name": "유평이", "phone_number": "01038163166"},
    {"name": "김혜슬", "phone_number": "01074737538"},
    {"name": "최순애", "phone_number": "01063218684"},
    {"name": "장국자", "phone_number": "01095729381"},
    {"name": "김양순", "phone_number": "01044405443"},
    {"name": "박혜숙", "phone_number": "01084508678"},
    {"name": "이종원", "phone_number": "01055139316"},
    {"name": "강정연", "phone_number": "01093815412"},
    {"name": "정연범", "phone_number": "01033031352"},
    {"name": "채문자", "phone_number": "01023647790"},
    {"name": "차미미", "phone_number": "01086439904"},
    {"name": "김남순", "phone_number": "01044525244"},
    {"name": "차주미", "phone_number": "01073208367"},
    {"name": "장신자", "phone_number": "01054718622"},
    {"name": "이영란", "phone_number": "01036742620"},
    {"name": "신성애", "phone_number": "01030417102"},
    {"name": "김난영", "phone_number": "01032128633"},
    {"name": "김인희", "phone_number": "01037646877"},
    {"name": "김현영", "phone_number": "01031274918"},
    {"name": "김경선", "phone_number": "01059683926"}, # JIN JING XIAN(김경선)
    {"name": "최정아", "phone_number": "01062433376"},
    {"name": "정오현", "phone_number": "01042977179"},
    {"name": "박병숙", "phone_number": "01025894223"},
    {"name": "최지영", "phone_number": "01034204707"},
    {"name": "류시혁", "phone_number": "01050245460"}, #류시혁(정미현)
    {"name": "최영아", "phone_number": "01077014918"},
    {"name": "김규화", "phone_number": "01057595689"},
    {"name": "전현아", "phone_number": "01022394598"},
    {"name": "안경복", "phone_number": "01075827583"},
    {"name": "김규자", "phone_number": "01034982347"},
    {"name": "이행자", "phone_number": "01027236246"},
    {"name": "최순화", "phone_number": "01082866003"},
    {"name": "전계희", "phone_number": "01087251203"},
    {"name": "채애숙", "phone_number": "01072146891"},
    {"name": "백제현", "phone_number": "01055321267"},
    {"name": "오정숙", "phone_number": "01037586868"},
    {"name": "박복자", "phone_number": "01050666307"},
    {"name": "손영자", "phone_number": "01080779299"},
    {"name": "이명희", "phone_number": "01066707418"},
    {"name": "이홍배", "phone_number": "01063177583"},
    {"name": "장영우", "phone_number": "01022132685"},
    {"name": "정진리", "phone_number": "01041027175"},
    {"name": "송정례", "phone_number": "01084183719"},
    {"name": "황미순", "phone_number": "01054938291"},
    {"name": "류선", "phone_number": "01033615560"},
    {"name": "유영희", "phone_number": "01030375373"},
    {"name": "곽노순", "phone_number": "01075681194"},
    {"name": "백미현", "phone_number": "01077536993"},
    {"name": "김원태", "phone_number": "01073384918"},
    {"name": "차윤미", "phone_number": "01041805659"},
    {"name": "정연임", "phone_number": "01024178002"},
    {"name": "남효현", "phone_number": "01039550669"},
    {"name": "김은혜", "phone_number": "01050030936"},
    {"name": "박경원", "phone_number": "01077700665"},
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


