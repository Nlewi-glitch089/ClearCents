// Lightweight fallback matchers to avoid requiring @testing-library/jest-dom
expect.extend({
	toBeInTheDocument(received) {
		const pass = received !== null && received !== undefined;
		return { pass, message: () => (pass ? 'element found' : 'element not found') };
	},
	toHaveValue(received, expected) {
		const pass = received && 'value' in received && String(received.value) === String(expected);
		return { pass, message: () => `expected element value ${String(received && received.value)} to equal ${String(expected)}` };
	},
	toHaveAttribute(received, attr, val) {
		const actual = received && received.getAttribute && received.getAttribute(attr);
		const pass = actual === val;
		return { pass, message: () => `expected attribute ${attr} to be ${val}, got ${actual}` };
	}
});
