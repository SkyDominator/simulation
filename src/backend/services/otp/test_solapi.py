from solapi import SolapiMessageService
from solapi.model import RequestMessage
from config.settings import settings
# API 키와 API Secret을 설정합니다
message_service = SolapiMessageService(
    api_key=settings.solapi_api_key, api_secret=settings.solapi_api_secret
)

# 단일 메시지 모델을 생성합니다
message = RequestMessage(
    from_="01031274918",  # 발신번호 (등록된 발신번호만 사용 가능, 01000000000 형식으로 입력해주셔야 합니다! (-)제외)
    to="01031274918",  # 수신번호(01000000000 형식으로 입력해주셔야 합니다! (-)제외)
    text="안녕하세요! SOLAPI Python SDK를 사용한 SMS 발송 예제입니다.",
)

# 메시지를 발송합니다
try:
    response = message_service.send(message)
    print("메시지 발송 성공!")
    print(f"Group ID: {response.group_info.group_id}")
    print(f"요청한 메시지 개수: {response.group_info.count.total}")
    print(f"성공한 메시지 개수: {response.group_info.count.registered_success}")
    print(f"실패한 메시지 개수: {response.group_info.count.registered_failed}")
except Exception as e:
    print(f"메시지 발송 실패: {str(e)}")