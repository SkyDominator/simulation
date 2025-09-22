import pathlib

TARGET_FILES = [
    'src/backend/constants.py',
    'src/backend/simulation_service.py',
    'src/backend/services/simulations.py',
    'src/backend/auth/jwt.py',
    'src/backend/config/settings.py',
    'src/backend/models/schemas.py',
    'src/backend/services/otp/otp_service.py',
    'src/backend/services/otp/utils.py',
    'src/backend/services/otp/solapi_sms.py',
    'src/backend/services/otp/nhn_cloud_sms.py',
    'src/backend/api/routes.py',
]

def dump_with_line_numbers(path: pathlib.Path):
    print(f"===== {path} =====")
    try:
        with path.open('r', encoding='utf-8') as f:
            for idx, line in enumerate(f, start=1):
                print(f"{idx:04d}: {line.rstrip()}")
    except FileNotFoundError:
        print(f"(missing)")
    print()

def main():
    root = pathlib.Path(__file__).parent
    for rel in TARGET_FILES:
        dump_with_line_numbers(root / rel)

if __name__ == '__main__':
    main()
