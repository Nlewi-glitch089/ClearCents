const push = jest.fn();

function useRouter(){
  return { push };
}

module.exports = { useRouter };
