import { appError, toErrorResponse } from "@/lib/api-errors"

export async function POST() {
	return toErrorResponse(
		appError(
			"BAD_REQUEST",
			"Use /api/predict-risk for skill analysis requests.",
			400
		),
		"api/codeforces/predict"
	)
}

