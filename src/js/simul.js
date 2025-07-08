
/** 헬퍼 함수들 **/
/**
 * isValidString 함수는 주어진 값이 유효한 문자열인지 확인합니다.
 * 유효한 문자열의 조건은 다음과 같습니다:
 * 1. 값이 문자열 타입이어야 합니다.
 * 2. 앞뒤 공백을 제거했을 때, 길이가 0이 아니어야 합니다.
 * 3. 공백을 제거한 값이 숫자로만 구성되어 있지 않아야 합니다.
 *
 * @param {any} value - 검사할 값
 * @returns {boolean} - 유효한 문자열이면 true, 그렇지 않으면 false
 */

function isValidString(value) {
  // 조건 1: 값이 실제로 문자열 타입인지 확인합니다.
  // 애초에 문자열 타입이 아니면(예: 숫자 123, null, true) 즉시 false를 반환합니다.
  if (typeof value !== 'string') {
    return false;
  }

  // 조건 2: 앞뒤 공백을 모두 제거(trim)했을 때, 길이가 0인지 확인합니다.
  // 길이가 0이면 빈 문자열이거나 공백만 있는 문자열이므로 false를 반환합니다.
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return false;
  }

  // 조건 3: 공백을 제거한 값이 숫자로만 구성되었는지 확인합니다.
  // isNaN(값)은 "값이 숫자가 아니면" true를 반환합니다.
  // 따라서 !isNaN(값)은 "값이 숫자이면" true가 됩니다.
  // "123" -> !isNaN("123") -> true (숫자 형태이므로 우리가 원하는 조건이 아님)
  // "Apple" -> !isNaN("Apple") -> false (숫자 형태가 아니므로 OK)
  if (!isNaN(trimmedValue)) {
    // 숫자로 변환 가능한 문자열이면 false를 반환합니다.
    return false;
  }

  // 위 모든 검사를 통과하면 유효한 문자열입니다.
  return true;
}

/**
 * getPlan 함수는 현재 시트의 이름에 따라 매출액 및 추천 여부의
 * 시작 및 종료 열과 행 번호를 반환합니다.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 현재 시트 객체
 * @return {Object} - 매출액 및 추천 여부의 시작 및 종료 열과 행 번호를 포함하는 객체
 * */

function getPlan(sheet){
  if (sheet.getName() === "A"){
    
    targetSheetName = 'A'; // 스크립트를 적용할 시트의 이름을 정확하게 입력하세요.
  
    salesStartColumn = 7;            // 시작 열 번호 (H)
    salesEndColumn = 35;              // 종료 열 번호 (AI)
    salesStartRow = 22;               // 시작 행 번호
    salesEndRow = 22;                // 종료 행 번호

    recommStartColumn = 7;            // 시작 열 번호 (H)
    recommEndColumn = 35;              // 종료 열 번호 (AI)
    recommStartRow = 19;               // 시작 행 번호
    recommEndRow = 19;                // 종료 행 번호
  }
  else if(sheet.getName() === "K"){
    
    targetSheetName = 'K'; // 스크립트를 적용할 시트의 이름을 정확하게 입력하세요.
  
    salesStartColumn = 7;            // 시작 열 번호 (H)
    salesEndColumn = 41;              // 종료 열 번호 (AO)
    salesStartRow = 22;               // 시작 행 번호
    salesEndRow = 22;                // 종료 행 번호

    recommStartColumn = 7;            // 시작 열 번호 (H)
    recommEndColumn = 41;              // 종료 열 번호 (AO)
    recommStartRow = 19;               // 시작 행 번호
    recommEndRow = 19;                // 종료 행 번호
  }

  return {
    targetSheetName,
    salesStartColumn,
    salesEndColumn,
    salesStartRow,
    salesEndRow,
    recommStartColumn,
    recommEndColumn,
    recommStartRow,
    recommEndRow
  };
}

/** 이벤트 처리 함수 **/

function onEdit(e) {
  
  const range = e.range;
  const row = range.getRow();
  
  // 엣지 케이스 처리: 만약 수정된 셀이 1행이라면 '위 셀'이 없으므로 스크립트를 중단합니다.
  if (row === 1) {
    return;
  }

  // 수정된 셀의 정보를 가져옵니다.
  const sheet = range.getSheet();
  const col = range.getColumn();
  const value = e.value;

  const plan = getPlan(sheet); // 플랜 선택

  let targetSheetName = plan.targetSheetName; // 스크립트를 적용할 시트의 이름을 정확하게 입력하세요.

  let salesStartColumn = plan.salesStartColumn;            // 시작 열 번호 (H)
  let salesEndColumn = plan.salesEndColumn;              // 종료 열 번호 (AI)
  let salesStartRow = plan.salesStartRow;               // 시작 행 번호
  let salesEndRow = plan.salesEndRow;                // 종료 행 번호

  let recommStartColumn = plan.recommStartColumn;            // 시작 열 번호 (H)
  let recommEndColumn = plan.recommEndColumn;              // 종료 열 번호 (AI)
  let recommStartRow = plan.recommStartRow;               // 시작 행 번호
  let recommEndRow = plan.recommEndRow;                // 종료 행 번호

  // -------------------------------------------------------------


  // 추천 여부 칸 이벤트 e
  // 수정된 셀이 지정된 범위 내에 있는지 확인합니다.
  if (sheet.getName() === targetSheetName &&
      row >= recommStartRow && row <= recommEndRow &&
      col >= recommStartColumn && col <= recommEndColumn) {
    
    // 값 변환 로직을 실행합니다.
    if (range.getNumRows() === 1 && range.getNumColumns() === 1 && isValidString(value)) {
      
      // 필요한 변수를 불러옵니다.
      const recomm = String(value);
      const salesText = range.offset(-1, 0).getValue();
        
      // 동적으로 추천 비용 값을 참조하여 그 값을 가져옵니다.
      const refCell_recommValue = range.offset(1, 0);
      const recommValue = refCell_recommValue.getValue(); //  추천 비용
      // 기준 값이 숫자가 아니면 스크립트가 오작동할 수 있으므로 중단합니다.
      if (isNaN(recommValue)) {
        console.log("셀(" + refCell_recommValue.getA1Notation() + ")의 값이 숫자가 아닙니다.");
        return;
      }
      const formattedRecommValue = recommValue.toLocaleString('ko-KR') + '원'

      // 동적으로 의무 매출액 값을 참조하여 가져옵니다.
      const refCell_MinSales = range.offset(2, 0); // 의무매출액
      minSalesValue = refCell_MinSales.getValue();
      // 기준 값이 숫자가 아니면 스크립트가 오작동할 수 있으므로 중단합니다.
      if (isNaN(minSalesValue)) {
        console.log("셀(" + refCell_MinSales.getA1Notation() + ")의 값이 숫자가 아닙니다.");
        return;
      }
      formattedMinSalesValue = minSalesValue.toLocaleString('ko-KR') + '원'

      // 동적으로 매출액 값을 참조하여 가져옵니다.
      const refCell_sales = range.offset(3, 0); // 매출액
      const sales = refCell_sales.getValue(); // 매출액
      // 기준 값이 숫자가 아니면 스크립트가 오작동할 수 있으므로 중단합니다.
      if (isNaN(sales)) {
        console.log("셀(" + refCell_sales.getA1Notation() + ")의 값이 숫자가 아닙니다.");
        return;
      }
      const formattedSales = sales.toLocaleString('ko-KR') + '원'
      
      // 조건 확인: 추천 제도 운영중인데 추천을 하지 못하는 경우
      if (recomm === '추천X') {
        console.log(recomm)
        // 추천X 시 최소 매출액을 구합니다. 
        const requiredSales = minSalesValue + recommValue

        // 추천 X: 현재 매출액이 최소 매출액보다 작으면 업데이트
        if (sales < requiredSales ){
          let updatedSales = requiredSales
          
          refCell_sales.setValue(updatedSales);
          formattedUpdatedSales = updatedSales.toLocaleString('ko-KR') + '원'

          const msg = `${salesText}에 추천X이면, 매출액이 최소 매출액 ${formattedUpdatedSales} (=의무 매출액 ${formattedMinSalesValue} + 추천 비용 ${formattedRecommValue})보다 크거나 같아야 합니다.\n\n 현재 매출액 ${formattedSales}은 최소 매출액보다 작습니다. 따라서 매출액을 최소 매출액으로 자동으로 변경합니다.`
          // 알림 메시지를 띄웁니다.
          SpreadsheetApp.getUi().alert(
            msg, // 메시지 내용
            SpreadsheetApp.getUi().ButtonSet.OK // 확인 버튼만 있는 창
          );
        }
        else{
          // 추천 X: 현재 매출액이 최소 매출액보다 크면 업데이트하지 않음.
        }
      }
      // 추천 O 또는 불 필요
      else{
        
        // 추천 O 또는 불 필요: 현재 매출액이 의무 매출액보다 작으면 업데이트
        if (sales < minSalesValue) {
          refCell_sales.setValue(minSalesValue);
          const msg = `입력한 ${salesText} 매출액(${formattedSales})이 ${salesText} 의무 매출액(${formattedMinSalesValue})보다 적습니다.\n따라서, 매출액을 다음과 같이 자동으로 변경합니다: \n\n매출액 = 의무 매출액(${formattedMinSalesValue})`
          // 알림 메시지를 띄웁니다.
          SpreadsheetApp.getUi().alert(
            msg, // 메시지 내용
            SpreadsheetApp.getUi().ButtonSet.OK // 확인 버튼만 있는 창
          );
        }
        else{
          // 추천 O 또는 불 필요: 현재 매출액이 의무 매출액보다 크면 업데이트 하지 않음.
        }
      }
    }
  }

  // 매출액 수정 이벤트 e
  // 수정된 셀이 지정된 범위 내에 있는지 확인합니다.
  if (sheet.getName() === targetSheetName &&
      row >= salesStartRow && row <= salesEndRow &&
      col >= salesStartColumn && col <= salesEndColumn) {
    
    // 값 변환 로직을 실행합니다.
    if (range.getNumRows() === 1 && range.getNumColumns() === 1 && !isNaN(value)) {
      
      // 필요한 변수를 불러옵니다.
      const sales = Number(value);
      const formattedSales = sales.toLocaleString('ko-KR') + '원'
      const salesText = range.offset(-4, 0).getValue();
        
      // 동적으로 추천 여부 값을 참조하여 그 값을 가져옵니다.
      const refCell_recomm = range.offset(-3, 0);
      const recomm = refCell_recomm.getValue(); //  추천 여부
      // 기준 값이 문자가 아니면 스크립트가 오작동할 수 있으므로 중단합니다.
      if (!isValidString(recomm)) {
        console.log("셀(" + refCell_recommValue.getA1Notation() + ")의 값이 문자가 아닙니다.");
        return;
      }
      const formattedRecomm = recomm.toLocaleString('ko-KR') + '원'

      // 동적으로 추천 비용 값을 참조하여 그 값을 가져옵니다.
      const refCell_recommValue = range.offset(-2, 0);
      const recommValue = refCell_recommValue.getValue(); //  추천 비용
      // 기준 값이 숫자가 아니면 스크립트가 오작동할 수 있으므로 중단합니다.
      if (isNaN(recommValue)) {
        console.log("셀(" + refCell_recommValue.getA1Notation() + ")의 값이 숫자가 아닙니다.");
        return;
      }
      const formattedRecommValue = recommValue.toLocaleString('ko-KR') + '원'

      // 동적으로 의무 매출액 값을 참조하여 가져옵니다.
      const refCell_MinSales = range.offset(-1, 0); // 의무매출액
      const minSalesValue = refCell_MinSales.getValue();
      // 기준 값이 숫자가 아니면 스크립트가 오작동할 수 있으므로 중단합니다.
      if (isNaN(minSalesValue)) {
        console.log("셀(" + refCell_MinSales.getA1Notation() + ")의 값이 숫자가 아닙니다.");
        return;
      }
      formattedMinSalesValue = minSalesValue.toLocaleString('ko-KR') + '원'


      // 조건 확인: 추천 제도 운영중인데 추천을 하지 못하는 경우
      if (recomm === '추천X') {
        // 추천X 시 최소 매출액을 구합니다. 
        const requiredSales = minSalesValue + recommValue

        // 추천 X: 현재 매출액이 최소 매출액보다 작으면 업데이트
        if (sales < requiredSales ){
          // 매출액 업데이트
          const updatedSales = requiredSales 
          range.setValue(updatedSales);
          formattedUpdatedSales = updatedSales.toLocaleString('ko-KR') + '원'

          const msg = `추천X이면, 매출액이 최소 매출액 ${formattedUpdatedSales} (=의무 매출액 ${formattedMinSalesValue} + 추천 비용 ${formattedRecommValue})보다 크거나 같아야 합니다.\n\n 현재 매출액 ${formattedSales}은 최소 매출액보다 작습니다. 따라서 매출액을 최소 매출액으로 자동으로 변경합니다.`
          // 알림 메시지를 띄웁니다.
          SpreadsheetApp.getUi().alert(
            msg, // 메시지 내용
            SpreadsheetApp.getUi().ButtonSet.OK // 확인 버튼만 있는 창
          );
        }
        else{
          // 추천 X: 현재 매출액이 최소 매출액보다 크면 업데이트하지 않음.
        }
      }
      // 추천 O 또는 불 필요
      else{
        console.log("테스트")
        // 추천 O 또는 불 필요: 현재 매출액이 의무 매출액보다 작으면 업데이트
        if (sales < minSalesValue) {
          range.setValue(minSalesValue);
          
          const msg = `입력한 ${salesText} 매출액(${formattedSales})이 ${salesText} 의무 매출액(${formattedMinSalesValue})보다 적습니다.\n따라서, 매출액을 다음과 같이 자동으로 변경합니다: \n\n매출액 = 의무 매출액(${formattedMinSalesValue})`
          // 알림 메시지를 띄웁니다.
          SpreadsheetApp.getUi().alert(
            msg, // 메시지 내용
            SpreadsheetApp.getUi().ButtonSet.OK // 확인 버튼만 있는 창
          );
        }
        else{
          // 추천 O 또는 불 필요: 현재 매출액이 의무 매출액보다 크면 업데이트 하지 않음.
        }
      }
    }
  }
}
