const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomId(length: number): string {
	let result = "";
	for (let i = 0; i < length; i++) {
		result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
	}
	return result;
}

export function generateThreadId(): string {
	return randomId(8);
}

export function generateCommentId(): string {
	return `c_${randomId(8)}`;
}
