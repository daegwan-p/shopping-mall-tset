# ODEUM Shopping Mall

Vite + React 프론트엔드와 Express + MongoDB 백엔드로 구성된 쇼핑몰입니다. 결제는 PortOne V2(KG 이니시스)를 사용합니다.

## 구성

| 폴더 | 역할 |
|------|------|
| `client/` | React(Vite) 스토어프론트 |
| `server/` | Express API |

## 사전 준비

- Node.js 18+
- MongoDB (로컬 또는 Atlas)
- PortOne 스토어/채널 키 (카드 결제 시)

## 환경 변수

시크릿은 커밋하지 마세요. 예제 파일을 복사한 뒤 값을 채웁니다.

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### Server (`server/.env`)

| 변수 | 설명 |
|------|------|
| `MONGODB_URI` | MongoDB 연결 문자열 |
| `JWT_SECRET` | JWT 서명 비밀값 (배포 시 반드시 변경) |
| `PORTONE_API_SECRET` | PortOne API Secret (결제 검증) |

### Client (`client/.env`)

| 변수 | 설명 |
|------|------|
| `VITE_API_URL` | API 베이스 (`/api` 또는 절대 URL) |
| `VITE_PORTONE_STORE_ID` | PortOne Store ID |
| `VITE_PORTONE_CHANNEL_KEY` | PortOne 채널 키 |

## 실행

터미널 두 개에서:

```bash
# API
cd server
npm install
npm run dev

# 프론트
cd client
npm install
npm run dev
```

기본 포트: API `5000`, Vite는 콘솔에 표시된 주소.

## 주요 기능

- 상품/장바구니/위시리스트, 쿠폰·적립금 결제 적용
- PortOne 카드 결제 및 무통장 입금
- 마이페이지(주문·등급·배송·리뷰) 및 관리자(주문·재고·정산·설정)
