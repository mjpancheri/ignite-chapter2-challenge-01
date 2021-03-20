import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  /*useEffect(() => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
  }, [cart]);*/

  function updateLocalStorage(cart: Product[]) {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
  }

  const addProduct = async (productId: number) => {
    try {
      const responseStock = await api.get(`/stock/${productId}`)
      const inStock: Stock = responseStock.data;
      const existProduct = cart.find(p => p.id === productId);
      
      if(!inStock || inStock.amount === 0 || (existProduct && existProduct.amount >= inStock.amount)) {
        toast.error('Quantidade solicitada fora de estoque');
      } else if(existProduct) {
        const newCart = cart.map(p => {
          if(p.id === productId) {
            return {...p, amount: p.amount + 1}
          }
          return p
        });
        setCart(newCart);
        updateLocalStorage(newCart);
      } else {
        const responseProduct = await api.get(`/products/${productId}`)
        const newCart = [...cart, {...responseProduct.data, amount: 1}];
        setCart(newCart);
        updateLocalStorage(newCart);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);
      if(!product) {
        toast.error('Erro na remoção do produto');
      } else {
        const newCart = cart.filter(product => product.id !== productId);
        setCart(newCart);
        updateLocalStorage(newCart);
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1) {
        return;
      }
      const response = await api.get(`/stock/${productId}`);
      const inStock = response.data;
      const existProduct = cart.find(p => p.id === productId);
      if (!existProduct) {
        throw new Error();
      }
      
      if(!inStock || amount > inStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        const newCart = cart.map(product => {
          if(product.id === productId) {
            return {...product, amount};
          }
          return product;
        });
        setCart(newCart);
        updateLocalStorage(newCart);
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
