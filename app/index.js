const API_URL = 'http://localhost:3000';

async function consumeAPI() {
	const response = await fetch(API_URL);

	const reader = response.body.pipeTo(
		new WritableStream({
			async write(chunk) {
				console.log(chunk);
			}
		})
	);
}

await consumeAPI();
